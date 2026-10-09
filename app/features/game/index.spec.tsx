import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router";
import { SWRConfig, useSWRConfig } from "swr";
import { beforeEach, expect, it, vi } from "vitest";
import { markTanbunSeen } from "~/features/review/api";
import { GamePlay } from ".";
import GameHeaderTabs from "./GameHeaderTabs";
import { adventureAccessKey } from "./access";
import { loadDungeon } from "./api";
import { enterDungeon, move, newSave } from "./domain";
import type { GameState } from "./state";

let available = true;
let consumeCount = 0;
let stateLoadCount = 0;
let state: GameState = { revision: 0, save: newSave() };
vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "player" }, isAuthenticated: true }),
}));
const server = setupServer(
  http.get("*/game/state", () => {
    stateLoadCount++;
    return HttpResponse.json(state);
  }),
  http.put("*/game/state", async ({ request }) => {
    const body = (await request.json()) as GameState & {
      consume_access: boolean;
    };
    if (body.revision !== state.revision)
      return HttpResponse.json({ detail: "競合" }, { status: 409 });
    if (body.consume_access) {
      if (!available)
        return HttpResponse.json(
          { detail: "別端末で使用済み" },
          { status: 409 },
        );
      available = false;
      consumeCount++;
    }
    const run = body.save.run;
    if (run?.phase === "battle" && !body.save.battleFeedback) {
      run.answerSeconds = 30;
      run.answerDeadline =
        state.save.run?.quizCursor === run.quizCursor &&
        state.save.run.answerDeadline
          ? state.save.run.answerDeadline
          : Date.now() + 30_000;
    } else if (run) {
      run.answerDeadline = null;
    }
    state = { revision: state.revision + 1, save: body.save };
    return HttpResponse.json(state);
  }),
  http.get("*/game/adventure-access", () =>
    HttpResponse.json({
      available,
      server_now: Date.now(),
      next_available_at: Date.now() + 600000,
    }),
  ),
  http.post("*/game/adventure-access/consume", () => {
    consumeCount++;
    if (!available)
      return HttpResponse.json({ detail: "使用済み" }, { status: 409 });
    available = false;
    return HttpResponse.json({
      available,
      server_now: Date.now(),
      next_available_at: Date.now() + 600000,
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

vi.mock("~/features/gamification/ResourceGrowth", () => ({
  useResourceGrowth: () => ({
    data: {
      resources: [
        {
          resource_id: "book",
          resource_name: "テストの本",
          power: 20,
          level: 1,
        },
        {
          resource_id: "previous",
          resource_name: "以前の本",
          power: 10,
          level: 1,
        },
      ],
    },
  }),
}));
vi.mock("~/shared/generated/gamification/gamification", () => ({
  useGetLearningProgressUserUserIdLearningProgressGet: () => ({
    data: { status: 200, data: { level: 1 } },
  }),
}));
vi.mock("~/features/gamification/invalidate", () => ({
  invalidateGamification: vi.fn(async () => undefined),
}));
vi.mock("~/features/tanbun/detail/Preview", () => ({
  useTanbunPreview: () => ({ openPreview, preview: null }),
}));
const { openPreview } = vi.hoisted(() => ({ openPreview: vi.fn() }));
vi.mock("~/features/quiz/QuizAttempt", () => ({
  default: ({ onAnswered }: { onAnswered: (correct: boolean) => void }) => (
    <button type="button" onClick={() => onAnswered(false)}>
      不正解を送信
    </button>
  ),
}));
vi.mock("~/features/review/api", () => ({ markTanbunSeen: vi.fn() }));
vi.mock("./api", () => ({
  loadDungeon: vi.fn(),
  loadConnectedKnowledge: vi.fn(async () => []),
}));

beforeEach(() => {
  available = true;
  consumeCount = 0;
  stateLoadCount = 0;
  state = { revision: 0, save: newSave() };
  localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(loadDungeon).mockResolvedValue({
    knowledge: [
      {
        uid: "sentence",
        sentence: "知識の進路",
        term: { names: ["進路の用語"] },
      },
    ],
    quizzes: [
      {
        quiz_id: "quiz",
        quiz_type: "sent2term",
        prompt: { subject: "条件", answer_kind: "term" },
        statement: "条件",
        options: { yes: "抽象化" },
        correct: ["yes"],
        created: "2026-10-08T00:00:00Z",
        no_correct_option: false,
      },
    ],
  });
  vi.mocked(markTanbunSeen).mockResolvedValue({
    sentence_id: "sentence",
    seen_on: "2026-10-08",
    exposure_count: 1,
    recorded: true,
  });
  vi.spyOn(Math, "random").mockReturnValue(0.1);
});
it("does not enter or lose local progress when another device consumed the right", async () => {
  server.use(
    http.put("*/game/state", () =>
      HttpResponse.json({ detail: "別端末で使用済み" }, { status: 409 }),
    ),
  );
  renderGame();
  await enter(false);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "別端末で使用済み",
  );
  expect(state.save.run).toBeUndefined();
});
function renderGame(path = "/game/adventure") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SWRConfig value={{ provider: () => new Map() }}>
        <GameHeaderTabs />
        <Routes>
          <Route
            path="/game/:menu?"
            element={
              <GamePlay
                userId="player"
                playerName="プレイヤー名"
                player={{
                  uid: "player",
                  created: "2026-10-09",
                  display_name: "プレイヤー名",
                  avatar_url: "https://example.com/profile.png",
                }}
              />
            }
          />
        </Routes>
        <RefreshAccess />
        <HistoryControls />
      </SWRConfig>
    </MemoryRouter>,
  );
}
it("switches game tabs with arrow keys without resetting the adventure", async () => {
  state = {
    revision: 1,
    save: enterDungeon(newSave(), "book", "テストの本", 1),
  };
  renderGame();
  await screen.findByText("HP 35/35");
  const user = userEvent.setup();
  act(() => screen.getByRole("tab", { name: "冒険" }).focus());
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("tab", { name: "ステータス" })).toHaveFocus();
  await waitFor(() =>
    expect(screen.getByTestId("pathname")).toHaveTextContent("/game/status"),
  );
  expect(screen.getByText("プレイヤー名")).toBeInTheDocument();
  await user.keyboard("{End}");
  expect(screen.getByRole("tab", { name: "アイテム" })).toHaveFocus();
  await waitFor(() =>
    expect(screen.getByTestId("pathname")).toHaveTextContent("/game/item"),
  );
  await user.keyboard("{Home}");
  expect(screen.getByRole("tab", { name: "冒険" })).toHaveFocus();
  expect(await screen.findByText("HP 35/35")).toBeInTheDocument();
  expect(stateLoadCount).toBe(1);
  expect(state.revision).toBe(1);
});

it("shows compact header tabs beside adventure access without a duplicate title", async () => {
  renderGame();
  expect(await screen.findByText("冒険可能")).toBeVisible();
  const tabs = screen.getByRole("tablist", { name: "ゲームメニュー" });
  expect(tabs.querySelector("[data-dashboard-tab-indicator]")).toHaveAttribute(
    "data-active-tab",
    "adventure",
  );
  expect(
    screen.queryByRole("heading", { name: "ゲーム" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("冒険権は毎時00分・30分に回復します。"),
  ).not.toBeInTheDocument();
  expect(tabs.parentElement?.parentElement).toContainElement(
    screen.getByText("冒険可能"),
  );
  expect(within(tabs).getAllByRole("tab")).toHaveLength(3);
  expect(screen.getByText("冒険可能")).toHaveAttribute(
    "title",
    "冒険権は毎時00分・30分に回復します。",
  );
});
function HistoryControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="pathname">{location.pathname}</output>
      <button type="button" onClick={() => void navigate(-1)}>
        ブラウザで戻る
      </button>
      <button type="button" onClick={() => void navigate(1)}>
        ブラウザで進む
      </button>
    </>
  );
}
function RefreshAccess() {
  const { mutate } = useSWRConfig();
  return (
    <button
      type="button"
      onClick={() => void mutate(adventureAccessKey("player"))}
    >
      冒険権を再確認
    </button>
  );
}
async function enter(select = true) {
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "ダンジョンに入る" }),
  );
  if (select)
    await user.click(
      await screen.findByRole("button", { name: /未探索.*進路の用語/ }),
    );
  return user;
}
it("records seen knowledge, takes quiz damage and restores the run after remount", async () => {
  const view = renderGame();
  const user = await enter();
  expect(consumeCount).toBe(1);
  await user.click(
    await screen.findByRole("button", { name: "見たよ · この道へ" }),
  );
  expect(
    await screen.findByRole("heading", { name: /敵と遭遇/ }),
  ).toBeInTheDocument();
  expect(markTanbunSeen).toHaveBeenCalledWith("sentence");
  await user.click(screen.getByRole("button", { name: "不正解を送信" }));
  expect(
    await screen.findByText("不正解 · あなたのHP −11"),
  ).toBeInTheDocument();
  expect(state.save.run).toMatchObject({
    hp: 24,
    phase: "battle",
    moves: 1,
    readIds: ["sentence"],
  });
  const loadsBeforeRemount = vi.mocked(loadDungeon).mock.calls.length;
  view.unmount();
  renderGame();
  expect(
    await screen.findByRole("heading", { name: /敵と遭遇/ }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("dialog")).getByText("HP 24/35"),
  ).toBeInTheDocument();
  const revisionBeforeClosing = state.revision;
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "条件" }),
  );
  expect(openPreview).toHaveBeenCalledWith({
    quizId: "quiz",
    role: "target",
    sentence: undefined,
  });
  expect(state.revision).toBe(revisionBeforeClosing);
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(state.revision).toBe(revisionBeforeClosing);
  expect(
    screen.getByRole("button", { name: "戦闘を開く" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "現在地 · 第1地点" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /現在地.*進路の用語/ }),
  ).toBeInTheDocument();
  expect(loadDungeon).toHaveBeenCalledTimes(loadsBeforeRemount);
});

it("times out only once and preserves feedback across reopening", async () => {
  const save = move(
    enterDungeon(newSave(), "book", "テストの本", 1),
    "sentence",
    0.1,
  );
  if (!save.run) throw new Error("Missing run");
  save.run.answerDeadline = Date.now() - 1000;
  save.run.answerSeconds = 30;
  state = { revision: 1, save };
  const view = renderGame();
  const user = userEvent.setup();
  expect(
    await screen.findByText("時間切れ · あなたのHP −11"),
  ).toBeInTheDocument();
  expect(state.save.run?.hp).toBe(24);
  expect(state.revision).toBe(2);
  expect(markTanbunSeen).not.toHaveBeenCalled();
  view.unmount();
  renderGame();
  expect(
    await screen.findByText("時間切れ · あなたのHP −11"),
  ).toBeInTheDocument();
  expect(state.revision).toBe(2);
  await user.click(screen.getByRole("button", { name: "続ける" }));
  expect(await screen.findByRole("timer")).toHaveTextContent("残り 30秒");
  expect(state.save.battleFeedback).toBeUndefined();
});

it("keeps tabs and preserves the adventure across navigation and browser history", async () => {
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  state = { revision: 1, save };
  renderGame();
  const user = userEvent.setup();
  await screen.findByText("HP 35/35");
  expect(screen.getByRole("tab", { name: "冒険" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(
    screen.queryByRole("button", { name: "行き先を変更する" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "ステータス" }));
  expect(screen.getByTestId("pathname")).toHaveTextContent("/game/status");
  expect(screen.getByText("ダンジョン攻略 0周")).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "アイテム" }));
  expect(screen.getByTestId("pathname")).toHaveTextContent("/game/item");
  expect(
    screen.getByText(/武器・アイテム機能は今後追加予定/),
  ).toBeInTheDocument();
  expect(state.revision).toBe(1);
  expect(state.save.run?.hp).toBe(35);
  await user.click(screen.getByRole("button", { name: "ブラウザで戻る" }));
  expect(screen.getByTestId("pathname").textContent).toBe("/game/status");
  expect(screen.getByRole("tab", { name: "ステータス" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "ブラウザで戻る" }));
  expect(screen.getByTestId("pathname").textContent).toBe("/game/adventure");
  expect(screen.getByText("HP 35/35")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "ブラウザで進む" }));
  await user.click(screen.getByRole("button", { name: "ブラウザで進む" }));
  expect(screen.getByTestId("pathname").textContent).toBe("/game/item");
  expect(stateLoadCount).toBe(1);
  expect(consumeCount).toBe(0);
});

it.each(["/game/status", "/game/status/"])(
  "opens status directly at %s without changing adventure state",
  async (path) => {
    state = {
      revision: 1,
      save: enterDungeon(newSave(), "book", "テストの本", 1),
    };
    renderGame(path);
    expect(await screen.findByText("ダンジョン攻略 0周")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "ステータス" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(state.save.run?.hp).toBe(35);
    expect(state.revision).toBe(1);
  },
);

it("opens the item URL directly", async () => {
  renderGame("/game/item/");
  expect(
    await screen.findByText(/武器・アイテム機能は今後追加予定/),
  ).toBeInTheDocument();
});

it("selects a destination when adventure is opened directly", async () => {
  renderGame("/game/adventure");
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "ダンジョンに入る" }),
  );
  expect(state.save.run?.resourceId).toBe("book");
  expect(consumeCount).toBe(1);
  await user.click(screen.getByRole("tab", { name: "ステータス" }));
  await user.click(screen.getByRole("button", { name: "ブラウザで戻る" }));
  expect(screen.getByTestId("pathname").textContent).toBe("/game/adventure");
  expect(
    screen.getByRole("button", { name: /未探索.*進路の用語/ }),
  ).toBeVisible();
  expect(stateLoadCount).toBe(1);
  expect(consumeCount).toBe(1);
});
it("does not advance when the seen API fails", async () => {
  vi.mocked(markTanbunSeen).mockRejectedValue(new Error("記録失敗"));
  renderGame();
  const user = await enter();
  await user.click(
    await screen.findByRole("button", { name: "見たよ · この道へ" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("記録失敗");
  expect(state.save.run).toMatchObject({ phase: "path", moves: 0 });
});

it("shows terms on knowledge offered as the next path", async () => {
  renderGame();
  await enter();
  const selected = screen.getByRole("region", { name: "選択した地点" });
  expect(within(selected).getByText("進路の用語")).toBeVisible();
  expect(within(selected).getByText("知識の進路")).toBeVisible();
});

it("fullscreen is presentation-only and does not reset or save the adventure", async () => {
  state = {
    revision: 1,
    save: enterDungeon(newSave(), "book", "テストの本", 1),
  };
  const original = state.save;
  renderGame();
  const user = userEvent.setup();
  await screen.findByText("HP 35/35");
  await user.click(screen.getByRole("button", { name: "マップを全画面表示" }));
  expect(
    within(screen.getByRole("dialog", { name: "冒険マップ" })).getByText(
      "HP 35/35",
    ),
  ).toBeVisible();
  await user.keyboard("{Escape}");
  expect(state.save).toBe(original);
  expect(state.revision).toBe(1);
  expect(consumeCount).toBe(0);
});

it("selects an uncleared previous dungeon without consuming access until entry", async () => {
  state = {
    revision: 1,
    save: { ...newSave(), visitedDungeons: ["previous", "gone"] },
  };
  renderGame("/game/adventure");
  const user = userEvent.setup();
  const history = await screen.findByRole("combobox", {
    name: "過去のダンジョン",
  });
  expect(
    within(history).getByRole("option", { name: "以前の本 · 攻略0周" }),
  ).toBeInTheDocument();
  expect(within(history).getAllByRole("option")).toHaveLength(2);
  await user.selectOptions(history, "previous");
  expect(
    await screen.findByRole("heading", { name: "以前の本" }),
  ).toBeInTheDocument();
  expect(state.revision).toBe(1);
  expect(consumeCount).toBe(0);
  await user.click(
    await screen.findByRole("button", { name: "ダンジョンに入る" }),
  );
  expect(state.save.run?.resourceId).toBe("previous");
  expect(consumeCount).toBe(1);
  expect(state.save.visitedDungeons).toEqual(["previous", "gone"]);
});

it("includes legacy cleared dungeons in the previous dungeon picker", async () => {
  state = { revision: 1, save: { ...newSave(), clears: { previous: 2 } } };
  renderGame("/game/adventure");
  const history = await screen.findByRole("combobox", {
    name: "過去のダンジョン",
  });
  expect(
    within(history).getByRole("option", { name: "以前の本 · 攻略2周" }),
  ).toBeInTheDocument();
});

it("shows an explicit empty history instead of hiding the section", async () => {
  renderGame("/game/adventure");
  expect(await screen.findByText("訪問履歴はまだありません。")).toBeVisible();
  expect(
    screen.getByRole("region", { name: "過去のダンジョン" }),
  ).toBeVisible();
});

it("explains when past dungeons are no longer available", async () => {
  state = { revision: 1, save: { ...newSave(), visitedDungeons: ["removed"] } };
  renderGame("/game/adventure");
  expect(
    await screen.findByText("参照できるダンジョンがありません。"),
  ).toBeVisible();
});

it("does not offer dungeon switching while an adventure is in progress", async () => {
  state = {
    revision: 1,
    save: {
      ...enterDungeon(newSave(), "book", "テストの本", 1),
      visitedDungeons: ["previous"],
    },
  };
  renderGame("/game/adventure");
  expect(await screen.findByText("HP 35/35")).toBeVisible();
  expect(
    screen.queryByRole("combobox", { name: "過去のダンジョン" }),
  ).not.toBeInTheDocument();
  expect(state.save.run?.resourceId).toBe("book");
});

it("parks a dungeon in the server snapshot and resumes its HP/location without a new right", async () => {
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  if (!save.run) throw new Error("Missing run");
  const content = await loadDungeon("book");
  state = {
    revision: 1,
    save: {
      ...save,
      visitedDungeons: ["book"],
      content,
      run: { ...save.run, hp: 24, moves: 2, readIds: ["sentence"] },
    },
  };
  available = false;
  renderGame();
  const user = userEvent.setup();
  expect(await screen.findByText("HP 24/35")).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "ダンジョンを切り替える" }),
  );
  expect(
    await screen.findByRole("combobox", { name: "過去のダンジョン" }),
  ).toBeVisible();
  expect(state.save.dungeons?.book.run.hp).toBe(24);
  expect(state.save.maps?.book.current).toBe("sentence");
  const resume = await screen.findByRole("button", { name: "現在地から再開" });
  expect(resume).toBeEnabled();
  await user.click(resume);
  expect(await screen.findByText("HP 24/35")).toBeVisible();
  expect(state.save.run?.moves).toBe(2);
  expect(state.save.maps?.book.current).toBe("sentence");
  expect(consumeCount).toBe(0);
});

it("admin unlock is applied without healing or erasing progress", async () => {
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  if (!save.run) throw new Error("Missing run");
  state = {
    revision: 1,
    save: {
      ...save,
      run: { ...save.run, hp: 24, moves: 5, kills: 2, phase: "rest" },
    },
  };
  available = false;
  renderGame();
  const user = userEvent.setup();
  expect(
    await screen.findByRole("button", { name: "あと10分" }),
  ).toBeDisabled();
  available = true;
  await user.click(screen.getByRole("button", { name: "冒険権を再確認" }));
  await user.click(await screen.findByRole("button", { name: "冒険を再開" }));
  expect(
    await screen.findByRole("heading", { name: "現在地 · 入口" }),
  ).toBeInTheDocument();
  expect(state.save.run).toMatchObject({
    hp: 24,
    moves: 0,
    kills: 2,
    phase: "path",
  });
  expect(consumeCount).toBe(1);
});
