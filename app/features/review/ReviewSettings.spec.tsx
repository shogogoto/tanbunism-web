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
    data: { data: { g: { nodes: [], edges: [] }, stats: {}, roots_: {} } },
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
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrap(element: React.ReactNode) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      <MemoryRouter>{element}</MemoryRouter>
    </SWRConfig>,
  );
}

it("標準設定の件数・方針を編集でき、今日のセットは勝手に作り直さない", async () => {
  const user = userEvent.setup();
  wrap(<ReviewSettingsManager />);
  await user.click(await screen.findByRole("button", { name: "標準を編集" }));
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
  expect(screen.queryByRole("button", { name: "標準を削除" })).toBeNull();
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

function RemovedSelector() {
  const [selected, setSelected] = useState("removed-setting");
  return <ReviewSettingsSelector selected={selected} onSelect={setSelected} />;
}

it("記憶した設定が削除されていたら標準へ戻る", async () => {
  wrap(<RemovedSelector />);
  await waitFor(() =>
    expect(screen.getByRole("combobox")).toHaveValue("default"),
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
  await screen.findByRole("option", { name: "苦手の本" });
  await user.selectOptions(
    screen.getByRole("combobox", { name: "復習設定を切り替え" }),
    "custom",
  );
  expect(screen.getByRole("combobox")).toHaveValue("custom");
  expect(localStorage.getItem(presetStorageKey("settings-user"))).toBe(
    "custom",
  );
  expect(screen.getByRole("link", { name: "設定を管理" })).toHaveAttribute(
    "href",
    "/dashboard?view=review-settings",
  );
});
