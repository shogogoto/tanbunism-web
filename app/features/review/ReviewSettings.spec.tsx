import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { SWRConfig } from "swr";
import { vi } from "vitest";
import { genericCache } from "~/shared/lib/indexed";
import { PERSONAL_TIMELINE_CACHE_KEY } from "./PersonalTimeline";
import ReviewSettingsManager from "./ReviewSettingsManager";
import ReviewSettingsSelector from "./ReviewSettingsSelector";
import {
  type ReviewSettings,
  defaultSettings,
  presetStorageKey,
} from "./settings";

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "settings-user" }, isAuthenticated: true }),
}));
vi.mock("~/shared/generated/entry/entry", () => ({
  useGetNamaspaceNamespaceGet: () => ({
    data: {
      data: {
        g: {
          nodes: [
            {
              id: {
                uid: "11111111-1111-4111-8111-111111111111",
                name: "長いリソースタイトル".repeat(12),
                authors: [],
                published: null,
              },
            },
          ],
          edges: [],
        },
        stats: {},
        roots_: {},
      },
    },
    isLoading: false,
  }),
}));
const server = setupServer();
let settings: ReviewSettings[];
let saved: Omit<ReviewSettings, "id"> | undefined;
let rebuilt: string | undefined;
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(async () => {
  settings = [
    defaultSettings,
    { ...defaultSettings, id: "custom", name: "苦手の本", priority: "weak" },
  ];
  saved = undefined;
  rebuilt = undefined;
  localStorage.clear();
  await genericCache.clear();
  server.use(
    http.get("*/quiz/study-plans", () => HttpResponse.json([])),
    http.get("*/review/settings", () => HttpResponse.json(settings)),
    http.put("*/review/settings/:id", async ({ request, params }) => {
      saved = (await request.json()) as Omit<ReviewSettings, "id">;
      const result = { ...saved, id: String(params.id) };
      settings = settings.map((s) => (s.id === result.id ? result : s));
      return HttpResponse.json(result);
    }),
    http.post("*/review/settings", async ({ request }) => {
      saved = (await request.json()) as Omit<ReviewSettings, "id">;
      const result = { ...saved, id: "new-setting" };
      settings.push(result);
      return HttpResponse.json(result);
    }),
    http.post("*/review/settings/:id/rebuild", ({ params }) => {
      rebuilt = String(params.id);
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete("*/review/settings/:id", ({ params }) => {
      settings = settings.filter((s) => s.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
});

it("既存StudyPlanも選択でき、今日の設定の記憶を上書きしない", async () => {
  const user = userEvent.setup();
  server.use(
    http.get("*/quiz/study-plans", () =>
      HttpResponse.json([
        {
          uid: "plan-1",
          name: "育てたい本",
          resource_ids: ["resource-1"],
          quiz_types: ["term2sent"],
          n_quiz: 5,
          n_option: 4,
          created: "2026-10-07",
        },
      ]),
    ),
  );
  function Selector() {
    const [selected, setSelected] = useState("custom");
    return (
      <ReviewSettingsSelector selected={selected} onSelect={setSelected} />
    );
  }
  wrap(<Selector />);
  await user.click(screen.getByRole("button", { name: "復習設定を切り替え" }));
  await screen.findByRole("option", { name: "育てたい本" });
  await waitFor(() =>
    expect(localStorage.getItem(presetStorageKey("settings-user"))).toBe(
      "custom",
    ),
  );
  await user.click(screen.getByRole("option", { name: "育てたい本" }));
  expect(screen.getByLabelText("復習設定を切り替え")).toHaveTextContent(
    "育てたい本",
  );
  expect(
    screen.queryByRole("combobox", { name: "復習対象を絞り込む" }),
  ).not.toBeInTheDocument();
  expect(localStorage.getItem(presetStorageKey("settings-user"))).toBe(
    "custom",
  );
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrap(element: React.ReactNode) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      <MemoryRouter>{element}</MemoryRouter>
    </SWRConfig>,
  );
}

it("長いリソース名は選択欄内で折り返し、選択して保存できる", async () => {
  const user = userEvent.setup();
  wrap(<ReviewSettingsManager />);
  await user.click(await screen.findByRole("button", { name: "今日を編集" }));
  await user.click(screen.getByRole("checkbox", { name: "すべて" }));
  const title = "長いリソースタイトル".repeat(12);
  const checkbox = screen.getByRole("checkbox", { name: title });
  const text = screen.getByText(title);
  expect(text).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
  expect(text.closest("fieldset")).toHaveClass("min-w-0");
  expect(screen.getByRole("dialog")).toHaveClass("sm:max-w-2xl");
  await user.click(checkbox);
  expect(checkbox).toBeChecked();
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByRole("status");
  expect(saved?.resource_ids).toEqual(["11111111-1111-4111-8111-111111111111"]);
});

it("標準設定の件数・方針を編集でき、今日のセットは勝手に作り直さない", async () => {
  const user = userEvent.setup();
  wrap(<ReviewSettingsManager />);
  await user.click(await screen.findByRole("button", { name: "今日を編集" }));
  fireEvent.change(screen.getByRole("spinbutton", { name: "一日の知識件数" }), {
    target: { value: "12" },
  });
  fireEvent.change(screen.getByRole("spinbutton", { name: "一日のクイズ数" }), {
    target: { value: "6" },
  });
  await user.selectOptions(screen.getByLabelText("優先方針"), "unseen");
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "変更は翌日から反映",
  );
  expect(saved).toMatchObject({
    tanbun_count: 12,
    quiz_count: 6,
    priority: "unseen",
    resource_ids: null,
  });
  expect(rebuilt).toBeUndefined();
});

it("自作設定を追加・削除でき、標準設定の削除は出さない", async () => {
  const user = userEvent.setup();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  wrap(<ReviewSettingsManager />);
  await user.click(
    await screen.findByRole("button", { name: "復習設定を追加" }),
  );
  await user.type(screen.getByRole("textbox", { name: "設定名" }), "短い復習");
  await user.click(screen.getByRole("checkbox", { name: "すべて" }));
  expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  await user.click(screen.getByRole("checkbox", { name: "すべて" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("link", { name: /短い復習/ })).toHaveAttribute(
    "href",
    "/review?preset=new-setting",
  );
  expect(screen.queryByRole("button", { name: "今日を削除" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "短い復習を削除" }));
  await waitFor(() =>
    expect(screen.queryByRole("link", { name: /短い復習/ })).toBeNull(),
  );
});

it("明示的な再作成はその設定のTLキャッシュを消し、他の設定は残す", async () => {
  const user = userEvent.setup();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const key = `${PERSONAL_TIMELINE_CACHE_KEY}:default:today`;
  const other = `${PERSONAL_TIMELINE_CACHE_KEY}:custom:today`;
  await genericCache.set(key, "stale", 60000);
  await genericCache.set(other, "keep", 60000);
  wrap(<ReviewSettingsManager />);
  await user.click(
    (await screen.findAllByRole("button", { name: "今日を作り直す" }))[0],
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "今日のセットを作り直しました",
  );
  expect(rebuilt).toBe("default");
  expect(await genericCache.get(key)).toBeUndefined();
  expect(await genericCache.get(other)).toBe("keep");
});

function Selector() {
  const [selected, setSelected] = useState("default");
  return <ReviewSettingsSelector selected={selected} onSelect={setSelected} />;
}

it("復習対象のポップアップで日付と自作設定を選択できる", async () => {
  const user = userEvent.setup();
  const recentDays = Array.from(
    { length: 7 },
    (_, index) => `2026-10-${String(7 - index).padStart(2, "0")}`,
  );
  function DatedSelector() {
    const [selected, setSelected] = useState("default");
    const [selectedDay, setSelectedDay] = useState(recentDays[0]);
    return (
      <ReviewSettingsSelector
        selected={selected}
        onSelect={setSelected}
        recentDays={recentDays}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
      />
    );
  }
  wrap(<DatedSelector />);
  const trigger = screen.getByRole("button", { name: "復習設定を切り替え" });
  expect(trigger).toHaveTextContent("今日");
  await user.click(trigger);
  expect(screen.getAllByRole("option", { name: "今日" })).toHaveLength(1);
  for (const day of recentDays.slice(2))
    expect(screen.getByRole("option", { name: day })).toBeVisible();
  await user.click(screen.getByRole("option", { name: "昨日（2026-10-06）" }));
  expect(trigger).toHaveTextContent("昨日（2026-10-06）");
  expect(screen.queryByRole("combobox")).toBeNull();
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name: "苦手の本" }));
  expect(trigger).toHaveTextContent("苦手の本 · 昨日（2026-10-06）");
  await user.click(trigger);
  const search = screen.getByRole("combobox", { name: "復習対象を絞り込む" });
  await user.type(search, "2026-10-03");
  await user.keyboard("{ArrowDown}{Enter}");
  expect(trigger).toHaveTextContent("苦手の本 · 2026-10-03");
  await user.click(trigger);
  await user.click(screen.getByRole("option", { name: "日替わりの推薦" }));
  expect(trigger).toHaveTextContent("2026-10-03");
});

it("復習対象を名前で絞り込み、現在の選択を維持する", async () => {
  const user = userEvent.setup();
  server.use(
    http.get("*/quiz/study-plans", () =>
      HttpResponse.json([
        {
          uid: "tcp",
          name: "TCP/IP入門",
          resource_ids: ["tcp"],
          quiz_types: ["term2sent"],
          n_quiz: 5,
          n_option: 4,
          created: "2026-10-07",
        },
        {
          uid: "logic",
          name: "論理学",
          resource_ids: ["logic"],
          quiz_types: ["term2sent"],
          n_quiz: 5,
          n_option: 4,
          created: "2026-10-07",
        },
      ]),
    ),
  );
  wrap(<Selector />);
  expect(
    screen.queryByRole("combobox", { name: "復習対象を絞り込む" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "復習設定を切り替え" }));
  await screen.findByRole("option", { name: "TCP/IP入門" });
  const search = screen.getByRole("combobox", { name: "復習対象を絞り込む" });
  expect(search).toHaveFocus();
  await user.type(search, "ｔｃｐ");
  expect(
    screen.getByRole("option", { name: "TCP/IP入門" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "論理学" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "苦手の本" }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("復習設定を切り替え")).toHaveTextContent("今日");
  await user.clear(search);
  await user.type(search, "存在しない対象");
  expect(screen.getByText("該当する対象はありません")).toBeInTheDocument();
  expect(screen.getByLabelText("復習設定を切り替え")).toHaveTextContent("今日");
  await user.clear(search);
  expect(screen.getByRole("option", { name: "論理学" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "苦手の本" })).toBeInTheDocument();
  await user.type(search, "論理");
  await user.keyboard("{ArrowDown}{Enter}");
  expect(screen.getByLabelText("復習設定を切り替え")).toHaveTextContent(
    "論理学",
  );
  await user.click(screen.getByRole("button", { name: "復習設定を切り替え" }));
  expect(
    screen.getByRole("combobox", { name: "復習対象を絞り込む" }),
  ).toHaveValue("");
  await user.keyboard("{Escape}");
  expect(
    screen.getByRole("button", { name: "復習設定を切り替え" }),
  ).toHaveFocus();
});

it("PageRankの知識向け優先方針を保存でき、フォールバックを説明する", async () => {
  wrap(<ReviewSettingsManager />);
  await userEvent.click(
    await screen.findByRole("button", { name: "今日を編集" }),
  );
  await userEvent.selectOptions(screen.getByLabelText("優先方針"), "pagerank");
  expect(screen.getByText(/クイズはバランス方式/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(saved?.priority).toBe("pagerank"));
});

function RemovedSelector() {
  const [selected, setSelected] = useState("removed-setting");
  return <ReviewSettingsSelector selected={selected} onSelect={setSelected} />;
}

it("記憶した設定が削除されていたら標準へ戻る", async () => {
  wrap(<RemovedSelector />);
  await waitFor(() =>
    expect(screen.getByLabelText("復習設定を切り替え")).toHaveTextContent(
      "今日",
    ),
  );
  await waitFor(() =>
    expect(localStorage.getItem(presetStorageKey("settings-user"))).toBe(
      "default",
    ),
  );
});
it("復習画面で設定を切り替え、最後の選択をユーザー別に記憶する", async () => {
  const user = userEvent.setup();
  wrap(<Selector />);
  await user.click(screen.getByRole("button", { name: "復習設定を切り替え" }));
  await screen.findByRole("option", { name: "苦手の本" });
  await user.click(screen.getByRole("option", { name: "苦手の本" }));
  expect(screen.getByLabelText("復習設定を切り替え")).toHaveTextContent(
    "苦手の本",
  );
  expect(localStorage.getItem(presetStorageKey("settings-user"))).toBe(
    "custom",
  );
  expect(screen.getByRole("link", { name: "設定を管理" })).toHaveAttribute(
    "href",
    "/dashboard?view=review-settings",
  );
});
