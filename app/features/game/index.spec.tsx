import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

import { adventureAccessKey } from "./access";
import {
  loadDungeon,
  loadDungeonRegionQuizPool,
  validateKnowledge,
} from "./api";
import { defaultBalance } from "./battle";
import { sampleCatalog } from "./catalog.fixtures";
import { enterDungeon, move, newSave } from "./domain";
import { ENTRANCE } from "./exploration";
import type { GameState } from "./state";

let available = true;
let consumeCount = 0;
let stateLoadCount = 0;
let automaticRecovery = false;
let nextAvailableAt = Date.now() + 600000;
let state: GameState = { revision: 0, save: newSave() };
vi.mock("~/features/auth/AuthProvider", async (importOriginal) => ({
  ...(await importOriginal()),
  useAuth: () => ({ user: { uid: "player" }, isAuthenticated: true }),
}));
const server = setupServer(
  http.get("*/game/catalog", () => HttpResponse.json(sampleCatalog)),
  http.get("*/game/gambits/capacity", () =>
    HttpResponse.json({ slots: 1, next_level: 20 }),
  ),
  http.get("*/game/specialties", () =>
    HttpResponse.json({
      slots: 1,
      next_level: 20,
      available: [],
      names: {},
      amounts: {},
    }),
  ),
  http.get("*/game/shop", () =>
    HttpResponse.json({
      products: [],
      review: { day: "2026-10-14", done: 0, total: 30, claimed: false },
    }),
  ),
  http.get("*/game/dungeons/:resource/preparation", () =>
    HttpResponse.json({ prepared_regions: 0, target_regions: 0 }),
  ),
  http.get("*/game/balance", () => HttpResponse.json(defaultBalance)),
  http.get("*/game/battle/context", () =>
    HttpResponse.json({
      balance: defaultBalance,
      enemies: Object.entries(state.save.content?.regionEnemies ?? {}).flatMap(
        ([region, pool]) =>
          pool.map((enemy) => ({
            ...enemy,
            hp: 20,
            attack: 12,
            region: Number(region),
            relations: 0,
          })),
      ),
    }),
  ),
  http.post("*/game/battle/start", async ({ request }) => {
    const body = (await request.json()) as {
      checkpoint: string;
      region: number;
      discovered_place: string | null;
    };
    state = {
      revision: state.revision + 1,
      save: {
        ...state.save,
        battle: {
          id: "battle",
          turn: 0,
          checkpoint: body.checkpoint,
          discoveredPlace: body.discovered_place,
          region: body.region,
          enemies: ["book:0:enemy:0"],
          quizIndices: { "book:0:enemy:0": 0 },
        },
      },
    };
    return HttpResponse.json(state);
  }),
  http.post("*/game/battle/turn", () => {
    const run = state.save.run;
    if (!run || !state.save.battle) throw new Error("Missing battle");
    state = {
      revision: state.revision + 1,
      save: {
        ...state.save,
        run: { ...run, hp: run.hp - 11, answerDeadline: null },
        battle: { ...state.save.battle, turn: state.save.battle.turn + 1 },
        battleFeedback: "正解 0/1 · 撃破 0体 · HP -11",
      },
    };
    return HttpResponse.json({
      state,
      results: { "book:0:enemy:0": false },
      damage: 11,
    });
  }),
  http.post("*/game/battle/abandon", () => {
    const run = state.save.run;
    if (run?.phase === "battle")
      state = {
        revision: state.revision + 1,
        save: {
          ...state.save,
          battle: null,
          run: {
            ...run,
            hp: run.hp - (state.save.battleFeedback ? 0 : 11),
            phase: "path",
            answerDeadline: null,
          },
          battleFeedback: "撤退しました。回答・XPは保持しています。",
        },
      };
    return HttpResponse.json(state);
  }),
  http.post("*/game/state/recover", () => {
    if (automaticRecovery && available && state.save.run) {
      const run = state.save.run;
      state = {
        revision: state.revision + 1,
        save: {
          ...state.save,
          run: {
            ...run,
            moves: 0,
            phase: run.phase === "rest" ? "path" : run.phase,
          },
        },
      };
      available = false;
      consumeCount++;
    }
    return HttpResponse.json(state);
  }),
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
    if (run && (run.mp ?? 0) > (run.maxMp ?? 0))
      return HttpResponse.json(
        {
          detail: [
            {
              loc: ["body", "save"],
              msg: "Value error, MPが最大値を超えています。",
              type: "value_error",
            },
          ],
        },
        { status: 422 },
      );
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
      next_available_at: nextAvailableAt,
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
      next_available_at: nextAvailableAt,
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

vi.mock("~/features/gamification/ResourceGrowth", () => ({
  useResourceGrowth: () => ({
    mutate: refreshGrowth,
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
    data: { status: 200, data: { level: playerLevel } },
  }),
}));
let playerLevel = 1;
vi.mock("~/features/gamification/invalidate", () => ({
  invalidateGamification: vi.fn(async () => undefined),
}));
vi.mock("~/features/tanbun/detail/Preview", () => ({
  useTanbunPreview: () => ({ openPreview, preview: null }),
  ContainedTanbunPreviews: ({ children }: { children: React.ReactNode }) =>
    children,
}));
const { openPreview, refreshGrowth } = vi.hoisted(() => ({
  openPreview: vi.fn(),
  refreshGrowth: vi.fn(async () => undefined),
}));
vi.mock("~/features/quiz/QuizAttempt", () => ({
  default: ({
    onAnswered,
    onConfirm,
  }: {
    onAnswered?: (correct: boolean) => void;
    onConfirm?: (selected: string[]) => void;
  }) => (
    <button
      type="button"
      onClick={() => (onConfirm ? onConfirm(["wrong"]) : onAnswered?.(false))}
    >
      不正解を送信
    </button>
  ),
}));
vi.mock("~/features/review/api", () => ({ markTanbunSeen: vi.fn() }));
vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  loadDungeon: vi.fn(),
  loadDungeonRegionQuizPool: vi.fn(),
  loadConnectedKnowledge: vi.fn(async () => []),
  validateKnowledge: vi.fn(async (_resource: string, ids: string[]) => ids),
}));

beforeEach(() => {
  playerLevel = 1;
  available = true;
  consumeCount = 0;
  stateLoadCount = 0;
  automaticRecovery = false;
  nextAvailableAt = Date.now() + 600000;
  state = { revision: 0, save: newSave() };
  localStorage.clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.mocked(validateKnowledge).mockImplementation(
    async (_resource, ids) => ids,
  );
  vi.mocked(loadDungeonRegionQuizPool).mockResolvedValue({
    ready: true,
    level: 1,
    required_quizzes: 5,
    available_quizzes: 5,
    quiz_ids: ["quiz"],
    enemy_types: 3,
    min_quizzes_per_enemy: 1,
    max_quizzes_per_enemy: 100,
    enemies: [
      { id: "book:0:enemy:0", name: "領域 1の敵 1", quiz_ids: ["quiz"] },
    ],
  });
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
it("challenges the milestone boss from its map node using the current server revision", async () => {
  available = false;
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  if (!save.run) throw new Error("Missing run");
  const places = Array.from({ length: 25 }, (_, i) => ({
    id: `p${i}`,
    region: Math.floor(i / 5),
  }));
  const content = {
    knowledge: places.map((p) => ({ uid: p.id, sentence: p.id })),
    quizzes: [],
  };
  vi.mocked(loadDungeon).mockResolvedValue(content);
  state = {
    revision: 4,
    save: {
      ...save,
      content,
      maps: { book: { current: "p24", places, edges: [] } },
      run: { ...save.run, phase: "path", moves: 2 },
    },
  };
  const challenge = vi.fn();
  server.use(
    http.post("*/game/battle/boss", async ({ request }) => {
      challenge(await request.json());
      return HttpResponse.json(
        { detail: "ボスのクイズを準備中です。" },
        { status: 409 },
      );
    }),
  );
  renderGame();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "達成度 5のボス" }),
  );
  await user.click(screen.getByRole("button", { name: "ボスに挑戦 · 1歩" }));
  await waitFor(() =>
    expect(challenge).toHaveBeenCalledExactlyOnceWith({
      revision: 4,
      level: 5,
      scheduled: true,
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "ボスのクイズを準備中です。",
  );
  expect(state.save.run?.moves).toBe(2);
  expect(
    screen.queryByRole("button", { name: /^ボス$/ }),
  ).not.toBeInTheDocument();
});

it("collects a region chest from the server with no moves left and restores its opened state", async () => {
  available = false;
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  if (!save.run) throw new Error("Missing run");
  const places = Array.from({ length: 5 }, (_, i) => ({
    id: `p${i}`,
    region: 0,
  }));
  const content = {
    knowledge: places.map((p) => ({ uid: p.id, sentence: p.id })),
    quizzes: [],
  };
  vi.mocked(loadDungeon).mockResolvedValue(content);
  state = {
    revision: 4,
    save: {
      ...save,
      content,
      maps: { book: { current: "p4", places, edges: [] } },
      run: { ...save.run, phase: "rest", moves: 5 },
    },
  };
  server.use(
    http.post("*/game/chests/open", async ({ request }) => {
      expect(await request.json()).toEqual({ revision: 4, region: 0 });
      state = {
        revision: 5,
        save: {
          ...state.save,
          maps: { book: { current: "@chest:0", places, edges: [] } },
          economy: {
            gold: 30,
            inventory: { step_potion: 1 },
            weapon: null,
            weapon_attack: 0,
            opened_chests: {
              book: { "0": { gold: 30, healing_potion: 0, step_potion: 1 } },
            },
          },
        },
      };
      return HttpResponse.json(state);
    }),
  );
  const user = userEvent.setup();
  const view = renderGame();
  await user.click(await screen.findByRole("button", { name: "領域 1の宝箱" }));
  await user.click(screen.getByRole("button", { name: "宝箱へ移動" }));
  expect(
    await screen.findByText("30 G、歩数回復薬 ×1 が入っていた。"),
  ).toBeVisible();
  expect(screen.getByLabelText("残り移動数")).toHaveTextContent("0");
  expect(screen.getByLabelText("所持ゴールド 30")).toBeVisible();
  expect(state.save.run?.moves).toBe(5);
  expect(consumeCount).toBe(0);
  view.unmount();
  renderGame();
  expect(
    await screen.findByRole("button", { name: "領域 1の宝箱（開封済み）" }),
  ).toHaveAttribute("aria-current", "location");
  expect(
    await screen.findByText("30 G、歩数回復薬 ×1 が入っていた。"),
  ).toBeVisible();
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
function renderGame(path = "/game") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SWRConfig value={{ provider: () => new Map() }}>
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

it("adds another user's dungeon using the current revision and selects it", async () => {
  state = { revision: 7, save: newSave() };
  const join = vi.fn();
  server.use(
    http.get("*/game/dungeons/public", () =>
      HttpResponse.json([
        {
          resource_id: "previous",
          name: "以前の本",
          owner_id: "other",
          owner_name: "別のユーザー",
          joined: false,
        },
      ]),
    ),
    http.post("*/game/dungeons/previous/join", async ({ request }) => {
      join(await request.json());
      state = {
        revision: 8,
        save: {
          ...state.save,
          unlockedDungeons: [
            {
              sourceId: "previous",
              resourceId: "previous",
              name: "以前の本",
              achievement: 0,
              source: "shared",
            },
          ],
        },
      };
      return HttpResponse.json(state);
    }),
  );
  renderGame();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "他ユーザーのダンジョン" }),
  );
  await user.click(await screen.findByRole("button", { name: "追加" }));
  await waitFor(() =>
    expect(join).toHaveBeenCalledExactlyOnceWith({ revision: 7 }),
  );
  await waitFor(() => expect(refreshGrowth).toHaveBeenCalled());
  await waitFor(() => expect(loadDungeon).toHaveBeenCalledWith("previous"));
  expect(
    await screen.findByRole("heading", { name: "以前の本" }),
  ).toBeVisible();
  expect(consumeCount).toBe(0);
});

it("keeps a delayed quiz refresh through a move and merges it without losing progress", async () => {
  const content = await loadDungeon("book");
  state = {
    revision: 1,
    save: { ...enterDungeon(newSave(), "book", "テストの本", 1), content },
  };
  vi.spyOn(Math, "random").mockReturnValue(0.9);
  let finish!: (value: typeof content) => void;
  vi.mocked(loadDungeon).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const user = userEvent.setup();
  renderGame();
  await waitFor(() => expect(finish).toBeDefined());
  await user.click(
    await screen.findByRole("button", { name: /未探索.*進路の用語/ }),
  );
  await user.click(await screen.findByRole("button", { name: "進む" }));
  await waitFor(() => expect(state.save.run?.moves).toBe(1));
  finish({
    ...content,
    knowledge: [
      ...content.knowledge,
      { uid: "added-place", sentence: "更新された知識" },
    ],
    quizzes: [...content.quizzes, { ...content.quizzes[0], quiz_id: "added" }],
  });
  await screen.findByRole("button", { name: /未探索.*更新された知識/ });
  // Persist another move after the delayed refresh; the new quiz must be included.
  await user.click(screen.getByRole("button", { name: /^入口\s*入口$/ }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /入口へ移動/ })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: /入口へ移動/ }));
  await waitFor(() => expect(state.save.content?.quizzes).toHaveLength(2));
  expect(state.save.run?.moves).toBe(2);
});

it("retains progress after a failed content refresh and allows a successful retry", async () => {
  const content = await loadDungeon("book");
  state = {
    revision: 1,
    save: { ...enterDungeon(newSave(), "book", "テストの本", 1), content },
  };
  vi.mocked(loadDungeon).mockRejectedValueOnce(new Error("temporary failure"));
  renderGame();
  const retry = await screen.findByRole("button", {
    name: "クイズ更新を再試行",
  });
  expect(state.save.run?.moves).toBe(0);
  expect(state.revision).toBe(1);
  await userEvent.setup().click(retry);
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "クイズ更新を再試行" }),
    ).not.toBeInTheDocument(),
  );
  expect(loadDungeon).toHaveBeenLastCalledWith("book", 0);
});

it("refreshes a candidate deleted after display without spending moves or resetting the run", async () => {
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  state = {
    revision: 1,
    save: { ...save, content: await loadDungeon("book") },
  };
  const user = userEvent.setup();
  renderGame();
  await user.click(
    await screen.findByRole("button", { name: /未探索.*進路の用語/ }),
  );
  const confirm = screen.getByRole("button", { name: "進む" });
  await waitFor(() => expect(confirm).toBeEnabled());
  vi.mocked(markTanbunSeen).mockRejectedValueOnce(
    Object.assign(new Error("単文が見つかりません"), { status: 404 }),
  );
  vi.mocked(validateKnowledge).mockResolvedValue([]);
  await user.click(confirm);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "移動数は消費せず、候補を更新しました",
  );
  expect(state.save.run?.moves).toBe(0);
  expect(state.save.run?.hp).toBe(35);
  expect(state.revision).toBe(1);
  expect(
    screen.queryByRole("button", { name: /未探索.*進路の用語/ }),
  ).not.toBeInTheDocument();
});

it("revalidates restored knowledge and leaves stale visited places in history but unavailable for travel", async () => {
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  state = {
    revision: 1,
    save: {
      ...save,
      content: await loadDungeon("book"),
      maps: {
        book: {
          current: "@entrance",
          places: [{ id: "sentence", region: 0 }],
          edges: [{ from: "@entrance", to: "sentence", kind: "detour" }],
        },
      },
    },
  };
  vi.mocked(validateKnowledge).mockResolvedValue([]);
  renderGame();
  await userEvent.setup().click(
    await screen.findByRole("button", {
      name: /領域 1.*進路の用語.*利用不可/,
    }),
  );
  expect(
    screen.queryByRole("button", { name: "進路の用語へ移動" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "詳細" }),
  ).not.toBeInTheDocument();
  expect(state.save.maps?.book.places).toHaveLength(1);
  expect(state.save.run?.hp).toBe(35);
  expect(markTanbunSeen).not.toHaveBeenCalled();
});

it.each([
  { moves: 3, phase: "path" },
  { moves: 5, phase: "rest" },
])(
  "automatically continues a completed lap with $moves moves spent",
  async ({ moves, phase }) => {
    const save = enterDungeon(newSave(), "book", "テストの本", 1);
    if (!save.run) throw new Error("Expected run");
    state = {
      revision: 1,
      save: {
        ...save,
        clears: { book: 1 },
        content: await loadDungeon("book"),
        run: {
          ...save.run,
          phase: "cleared",
          hp: 20,
          moves,
          kills: 3,
          readIds: ["sentence"],
        },
        maps: {
          book: {
            current: "sentence",
            places: [{ id: "sentence", region: 0 }],
            edges: [{ from: "@entrance", to: "sentence", kind: "detour" }],
          },
        },
      },
    };
    available = false;
    const view = renderGame();
    await waitFor(() => expect(state.save.run?.phase).toBe(phase));
    expect(state.save.run?.hp).toBe(20);
    expect(state.save.run?.moves).toBe(moves);
    expect(state.save.run?.kills).toBe(0);
    expect(state.save.clears.book).toBe(1);
    expect(state.save.maps?.book.current).toBe("sentence");
    expect(consumeCount).toBe(0);
    if (phase === "rest") {
      const message = screen.getByRole("region", { name: "歩数回復の案内" });
      expect(
        within(message).getByRole("link", { name: "復習へ" }),
      ).toHaveAttribute("href", "/review?preset=default");
      expect(
        within(message).getByRole("link", { name: "クイズを解く" }),
      ).toHaveAttribute("href", "/review?view=quiz&preset=default");
      expect(
        screen.queryByRole("region", { name: "選択した地点" }),
      ).not.toBeInTheDocument();
    } else {
      expect(
        screen.queryByRole("region", { name: "歩数回復の案内" }),
      ).not.toBeInTheDocument();
    }
    view.unmount();
    renderGame();
    await screen.findByText("20/35");
    expect(
      screen.queryByRole("button", { name: "探索を続ける" }),
    ).not.toBeInTheDocument();
  },
);

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

it("shows a stopped preparation and retries it instead of claiming it is still running", async () => {
  const initial = enterDungeon(newSave(), "book", "本", 1);
  state = {
    revision: 1,
    save: { ...initial, content: await loadDungeon("book") },
  };
  let status = "exhausted";
  const retry = vi.fn();
  const preparation = () => ({
    prepared_regions: 0,
    target_regions: 1,
    preparation: { status, required_quiz_count: 10 },
  });
  server.use(
    http.get("*/game/dungeons/:resource/preparation", () =>
      HttpResponse.json(preparation()),
    ),
    http.post("*/game/dungeons/:resource/preparation/retry", () => {
      retry();
      status = "running";
      return HttpResponse.json(preparation());
    }),
  );
  renderGame();
  expect(
    await screen.findByText("作成できるクイズが不足しています"),
  ).toBeVisible();
  expect(screen.queryByText("クイズ準備中")).not.toBeInTheDocument();
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "クイズの準備を再試行" }));
  expect(await screen.findByText("クイズ準備中")).toBeVisible();
  expect(retry).toHaveBeenCalledOnce();
});
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
it.each([0, 3, 30])(
  "initializes a new adventure with the configured MP maximum %i",
  async (maxMp) => {
    server.use(
      http.get("*/game/balance", () =>
        HttpResponse.json({ ...defaultBalance, base_mp: maxMp }),
      ),
    );
    renderGame();
    await enter(false);
    await waitFor(() =>
      expect(state.save.run).toMatchObject({
        resourceId: "book",
        mp: maxMp,
        maxMp,
      }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  },
);

it("does not mark combat on an already explored place as a new discovery", async () => {
  state = {
    revision: 1,
    save: {
      ...enterDungeon(newSave(), "book", "テストの本", 1),
      content: await loadDungeon("book"),
      maps: {
        book: {
          current: ENTRANCE,
          places: [{ id: "sentence", region: 0 }],
          edges: [{ from: ENTRANCE, to: "sentence", kind: "detour" }],
        },
      },
    },
  };
  renderGame();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /領域 1.*進路の用語/ }),
  );
  await user.click(
    await screen.findByRole("button", { name: "進路の用語へ移動" }),
  );
  await screen.findByRole("heading", { name: /敵と遭遇/ });
  expect(state.save.battle?.discoveredPlace).toBeNull();
});

it("records seen knowledge and a batch turn, then retreats after remount without losing saved HP", async () => {
  const view = renderGame();
  const user = await enter();
  expect(consumeCount).toBe(1);
  await user.click(await screen.findByRole("button", { name: "進む" }));
  expect(
    await screen.findByRole("heading", { name: /敵と遭遇/ }),
  ).toBeInTheDocument();
  expect(markTanbunSeen).toHaveBeenCalledWith("sentence", true);
  expect(state.save.content?.regionEnemies?.[0]).toEqual([
    {
      id: "book:0:enemy:0",
      name: "領域 1の敵 1",
      quizIndex: 0,
      quizIndexes: [0],
    },
  ]);
  expect(state.save.run?.enemyId).toBe("book:0:enemy:0");
  expect(state.save.battle?.discoveredPlace).toBe("sentence");
  await user.click(screen.getByRole("button", { name: "不正解を送信" }));
  await user.click(
    await screen.findByRole("button", { name: "結果を処理 · 1/1" }),
  );
  expect(
    screen.queryByText("正解 0/1 · 撃破 0体 · HP -11"),
  ).not.toBeInTheDocument();
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
    within(screen.getByRole("dialog")).getByRole("region", {
      name: "プレイヤー",
    }),
  ).toHaveTextContent(/HP\s*24\/35/);
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
  // Reopening revalidates prepared content without replacing saved progress.
  expect(loadDungeon).toHaveBeenCalledTimes(loadsBeforeRemount + 1);
});

it("resumes a scheduled battle without retreating or resetting its deadline and queue", async () => {
  const content = await loadDungeon("book");
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  if (!save.run) throw new Error("Missing run");
  const deadline = Date.now() + 45000;
  const enemyId = "resume-enemy";
  save.content = {
    ...content,
    regionEnemies: { "0": [{ id: enemyId, name: "再開の敵", quizIndex: 0 }] },
  };
  save.run = {
    ...save.run,
    phase: "battle",
    answerSeconds: 45,
    answerDeadline: deadline,
  };
  save.battle = {
    id: "resume",
    turn: 0,
    region: 0,
    checkpoint: "@entrance",
    enemies: [enemyId],
    quizIndices: { [enemyId]: 0 },
    schedule: {
      formula: "sqrt",
      actor_id: "player",
      quiz_enemy_id: enemyId,
      enemy_hp: { [enemyId]: 7 },
      queue: [
        { actor_id: "player", distance: 0 },
        { actor_id: enemyId, distance: 3 },
      ],
    },
  };
  state = { revision: 4, save };
  const abandon = vi.fn();
  server.use(
    http.post("*/game/battle/abandon", () => {
      abandon();
      return HttpResponse.json(state);
    }),
  );
  const view = renderGame();
  expect(await screen.findByRole("region", { name: "行動予測" })).toBeVisible();
  expect(screen.getByRole("region", { name: "敵一覧" })).toHaveTextContent(
    "HP 7/20",
  );
  view.unmount();
  renderGame();
  expect(await screen.findByRole("region", { name: "行動予測" })).toBeVisible();
  expect(abandon).not.toHaveBeenCalled();
  expect(state.revision).toBe(4);
  expect(state.save.run?.answerDeadline).toBe(deadline);
  expect(state.save.battle?.schedule?.queue).toEqual(
    save.battle?.schedule?.queue,
  );
});

it("abandoned timed-out combat retreats only once and preserves feedback across reopening", async () => {
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
    await screen.findByText("撤退しました。回答・XPは保持しています。"),
  ).toBeInTheDocument();
  expect(state.save.run?.hp).toBe(24);
  expect(state.revision).toBe(2);
  expect(markTanbunSeen).not.toHaveBeenCalled();
  view.unmount();
  renderGame();
  expect(
    await screen.findByText("撤退しました。回答・XPは保持しています。"),
  ).toBeInTheDocument();
  expect(state.revision).toBe(2);
  await user.click(screen.getByRole("button", { name: "続ける" }));
  await waitFor(() =>
    expect(screen.queryByRole("timer")).not.toBeInTheDocument(),
  );
  expect(state.save.battleFeedback).toBeUndefined();
});

it.each([false, true])(
  "opens allocation from the map HP bar (fullscreen: %s) without spending moves",
  async (fullscreen) => {
    playerLevel = 2;
    state = {
      revision: 1,
      save: enterDungeon(newSave(), "book", "テストの本", 2),
    };
    const requests: unknown[] = [];
    server.use(
      http.put("*/game/allocation", async ({ request }) => {
        const allocation = (await request.json()) as {
          hp: number;
          attack: number;
          defense: number;
        };
        requests.push(allocation);
        state = {
          revision: state.revision + 1,
          save: {
            ...state.save,
            allocation,
            run: state.save.run
              ? { ...state.save.run, maxHp: 35 + allocation.hp * 5 }
              : undefined,
          },
        };
        return HttpResponse.json(state);
      }),
    );
    renderGame();
    const user = userEvent.setup();
    await screen.findByText("35/35");
    if (fullscreen)
      await user.click(
        screen.getByRole("button", { name: "マップを全画面表示" }),
      );
    const hp = screen.getByRole("button", {
      name: "プレイヤーのステータス・育成ポイントを開く",
    });
    expect(
      within(hp).getByRole("progressbar", { name: "プレイヤーHP" }),
    ).toBeVisible();
    if (fullscreen) await user.click(hp);
    else {
      hp.focus();
      await user.keyboard("{Enter}");
    }
    expect(screen.getByTestId("pathname")).toHaveTextContent("/game/status");
    expect(
      screen.getByRole("dialog", { name: "ゲームメニュー" }),
    ).toBeVisible();
    expect(await screen.findByLabelText("割り振りポイント")).toHaveTextContent(
      /0\/3 pt/,
    );
    const increase = screen.getByRole("button", {
      name: "最大HPにポイントを割り振る",
    });
    await user.click(increase);
    await user.click(increase);
    await user.click(increase);
    expect(screen.getByLabelText("割り振りポイント")).toHaveTextContent(
      /3\/3 pt/,
    );
    await user.click(screen.getByRole("button", { name: "割り振りを保存" }));
    await screen.findByText("現在HP 35/50");
    expect(requests).toEqual([
      {
        hp: 3,
        mp: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        speed: 0,
      },
    ]);
    fireEvent.click(
      screen.getByRole("button", { name: "ブラウザで戻る", hidden: true }),
    );
    expect(screen.getByTestId("pathname")).toHaveTextContent("/game");
    expect(
      screen.queryByRole("dialog", { name: "ゲームメニュー" }),
    ).not.toBeInTheDocument();
    if (fullscreen)
      expect(screen.getByRole("dialog", { name: "冒険マップ" })).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "ブラウザで進む", hidden: true }),
    );
    expect(screen.getByTestId("pathname")).toHaveTextContent("/game/status");
    expect(
      screen.getByRole("dialog", { name: "ゲームメニュー" }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "ゲームメニュー" }),
    ).not.toBeInTheDocument();
    if (fullscreen)
      expect(screen.getByRole("dialog", { name: "冒険マップ" })).toBeVisible();
    expect(await screen.findByText("35/50")).toBeVisible();
    expect(state.save.run?.moves).toBe(0);
    expect(consumeCount).toBe(0);
  },
);

it.each(["/game/status", "/game/status/"])(
  "opens status directly at %s without changing adventure state",
  async (path) => {
    state = {
      revision: 1,
      save: enterDungeon(newSave(), "book", "テストの本", 1),
    };
    renderGame(path);
    expect(
      await screen.findByRole("tab", { name: "ステータス" }),
    ).toHaveAttribute("data-state", "active");
    expect(
      screen.getByRole("dialog", { name: "ゲームメニュー" }),
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: "アイテム" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "実績" })).toBeVisible();
    expect(
      screen.queryByText("育成ポイントを割り振れます。振り直しは無料です。"),
    ).toBeNull();
    expect(screen.queryByText(/ダンジョン攻略\s+\d+周/)).toBeNull();
    expect(state.save.run?.hp).toBe(35);
    expect(state.revision).toBe(1);
  },
);

it("opens the item URL directly", async () => {
  renderGame("/game/item/");
  expect(await screen.findByRole("tab", { name: "アイテム" })).toHaveAttribute(
    "data-state",
    "active",
  );
});

it("switches the numbered menu tabs with Ctrl+digits", async () => {
  renderGame();
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "ステータス" }));
  expect(
    await screen.findByRole("dialog", { name: "ゲームメニュー" }),
  ).toBeVisible();
  const tabs = ["ステータス", "アイテム", "ガンビット", "専門分野", "実績"];
  for (const [index, label] of tabs.entries()) {
    const tab = screen.getByRole("tab", { name: label });
    expect(tab).toHaveTextContent(String(index + 1));
    expect(tab).toHaveAttribute("title", `Ctrl + ${index + 1}`);
    await user.keyboard(`{Control>}${index + 1}{/Control}`);
    expect(screen.getByRole("tab", { name: label })).toHaveAttribute(
      "data-state",
      "active",
    );
  }
  expect(state.revision).toBe(0);
  expect(consumeCount).toBe(0);
});

it("does not switch menu tabs while typing or when another dialog is on top", async () => {
  renderGame("/game/status");
  await screen.findByRole("tab", { name: "ステータス" });
  const input = document.createElement("input");
  document.body.append(input);
  input.focus();
  fireEvent.keyDown(input, { key: "2", ctrlKey: true });
  expect(screen.getByRole("tab", { name: "ステータス" })).toHaveAttribute(
    "data-state",
    "active",
  );
  input.remove();
  const overlay = document.createElement("div");
  overlay.setAttribute("role", "dialog");
  document.body.append(overlay);
  fireEvent.keyDown(overlay, { key: "2", ctrlKey: true });
  expect(screen.getByRole("tab", { name: "ステータス" })).toHaveAttribute(
    "data-state",
    "active",
  );
  overlay.remove();
});

it("switches between status, inventory, and achievement tabs in the game menu", async () => {
  state = {
    revision: 1,
    save: {
      ...enterDungeon(newSave(), "book", "テストの本", 1),
      clears: { book: 2 },
      bossClears: { book: [5] },
      unlockedDungeons: [
        {
          sourceId: "book",
          resourceId: "previous",
          name: "以前の本",
          achievement: 3,
        },
      ],
    },
  };
  renderGame("/game/status");
  const user = userEvent.setup();
  await screen.findByRole("dialog", { name: "ゲームメニュー" });
  expect(screen.getByRole("dialog", { name: "ゲームメニュー" })).toHaveClass(
    "top-[5dvh]",
    "translate-y-0",
    "max-h-[90dvh]",
    "overflow-y-auto",
    "sm:max-w-[calc(100vw-4rem)]",
    "lg:max-w-5xl",
  );
  await user.click(screen.getByRole("tab", { name: "アイテム" }));
  expect(screen.getByTestId("pathname")).toHaveTextContent("/game/item");
  expect(screen.getByRole("tabpanel", { name: "アイテム" })).toBeVisible();
  expect(screen.getByRole("dialog", { name: "ゲームメニュー" })).toHaveClass(
    "top-[5dvh]",
    "translate-y-0",
  );
  await user.click(screen.getByRole("tab", { name: "実績" }));
  expect(screen.getByTestId("pathname")).toHaveTextContent(
    "/game/achievements",
  );
  expect(
    screen.getByRole("region", { name: "ダンジョンの達成度" }),
  ).toBeVisible();
  expect(screen.getByRole("dialog", { name: "ゲームメニュー" })).toHaveClass(
    "top-[5dvh]",
    "translate-y-0",
  );
  expect(screen.queryByText("2回")).not.toBeInTheDocument();
  expect(
    within(screen.getByRole("dialog", { name: "ゲームメニュー" })).getByText(
      "以前の本",
    ),
  ).toBeVisible();
});

it("opens the shop from the gold HUD while keeping the map mounted", async () => {
  state = {
    revision: 1,
    save: {
      ...enterDungeon(newSave(), "book", "本", 1),
      economy: { gold: 120, inventory: {}, weapon: null, weapon_attack: 0 },
    },
  };
  renderGame();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "所持ゴールド 120" }),
  );
  expect(
    await screen.findByRole("dialog", { name: "ゲームメニュー" }),
  ).toBeVisible();
  expect(screen.getByTestId("pathname")).toHaveTextContent("/game/shop");
  await user.click(screen.getByRole("button", { name: "所持品" }));
  expect(screen.getByTestId("pathname")).toHaveTextContent("/game/item");
  await user.keyboard("{Escape}");
  expect(screen.getByTestId("pathname")).toHaveTextContent("/game");
});

it("shows the item box and gold beside the map player status", async () => {
  state = {
    revision: 1,
    save: enterDungeon(newSave(), "book", "テストの本", 1),
  };
  renderGame();
  await screen.findByRole("button", { name: "アイテムボックスを開く" });
  expect(screen.getByLabelText("所持ゴールド 0")).toBeVisible();
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "アイテムボックスを開く" }));
  expect(screen.getByRole("dialog", { name: "ゲームメニュー" })).toBeVisible();
});

it("records floating item navigation in history and closes direct status links safely", async () => {
  const view = renderGame("/game/status");
  const user = userEvent.setup();
  await screen.findByRole("dialog", { name: "ゲームメニュー" });
  await user.keyboard("{Escape}");
  expect(screen.getByTestId("pathname")).toHaveTextContent("/game");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "アイテム" }));
  expect(screen.getByTestId("pathname")).toHaveTextContent("/game/item");
  expect(screen.getByRole("dialog", { name: "ゲームメニュー" })).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "ブラウザで戻る", hidden: true }),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "ブラウザで進む", hidden: true }),
  );
  expect(screen.getByRole("dialog", { name: "ゲームメニュー" })).toBeVisible();
  expect(consumeCount).toBe(0);
  view.unmount();
});

it("shows recovery beside remaining steps instead of a tab header", async () => {
  available = false;
  state = {
    revision: 1,
    save: enterDungeon(newSave(), "book", "テストの本", 1),
  };
  renderGame();
  const recovery = await screen.findByText(/回復まで .*分/);
  expect(recovery.closest("aside")).toContainElement(
    screen.getByLabelText("残り移動数"),
  );
  expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
});

it("selects a destination when adventure is opened directly", async () => {
  renderGame("/game");
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "ダンジョンに入る" }),
  );
  expect(state.save.run?.resourceId).toBe("book");
  expect(consumeCount).toBe(1);
  await user.click(
    screen.getByRole("button", {
      name: "プレイヤーのステータス・育成ポイントを開く",
    }),
  );
  await user.keyboard("{Escape}");
  expect(screen.getByTestId("pathname").textContent).toBe("/game");
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
  await user.click(await screen.findByRole("button", { name: "進む" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("記録失敗");
  expect(state.save.run).toMatchObject({ phase: "path", moves: 0 });
});

it("does not spend a move or record knowledge if the server roster is missing", async () => {
  vi.mocked(loadDungeonRegionQuizPool).mockResolvedValueOnce({
    ready: true,
    level: 1,
    required_quizzes: 5,
    available_quizzes: 5,
    quiz_ids: ["quiz"],
    enemies: [],
  });
  renderGame();
  const user = await enter();
  await user.click(await screen.findByRole("button", { name: "進む" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "領域の敵を読み込めませんでした",
  );
  expect(state.save.run).toMatchObject({ phase: "path", moves: 0 });
  expect(markTanbunSeen).not.toHaveBeenCalled();
});

it("accepts a prepared hex quiz ID when the displayed quiz ID has hyphens", async () => {
  const content = await loadDungeon("book");
  const id = "a946e99b-072a-420a-a0ef-80bf4fc7f7bf";
  content.quizzes[0].quiz_id = id;
  vi.mocked(loadDungeonRegionQuizPool).mockResolvedValue({
    ready: true,
    level: 1,
    required_quizzes: 5,
    available_quizzes: 5,
    quiz_ids: [id.replaceAll("-", "")],
    enemies: [
      {
        id: "book:0:enemy:0",
        name: "領域 1の敵 1",
        quiz_ids: [id.replaceAll("-", "")],
      },
    ],
  });
  renderGame();
  const user = await enter();
  await user.click(await screen.findByRole("button", { name: "進む" }));
  await waitFor(() => expect(state.save.run?.moves).toBe(1));
  expect(markTanbunSeen).toHaveBeenCalledWith("sentence", true);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("shows terms on knowledge offered as the next path", async () => {
  renderGame();
  await enter();
  const selected = screen.getByRole("region", { name: "選択した地点" });
  expect(within(selected).getByText("進路の用語")).toBeVisible();
  expect(within(selected).getByText("知識の進路")).toBeVisible();
});

it("hydrates fixed population quizzes missing from recommendations before spending a move", async () => {
  const initialContent = await loadDungeon("book");
  const preparedQuiz = {
    ...initialContent.quizzes[0],
    quiz_id: "fixed-pool-quiz",
  };
  const pool = {
    ready: true,
    level: 1,
    required_quizzes: 5,
    available_quizzes: 5,
    quiz_ids: [preparedQuiz.quiz_id],
    enemies: [
      {
        id: "book:0:enemy:0",
        name: "領域1の敵",
        quiz_ids: [preparedQuiz.quiz_id],
      },
    ],
  };
  vi.mocked(loadDungeonRegionQuizPool)
    .mockResolvedValueOnce(pool)
    .mockResolvedValueOnce({ ...pool, quizzes: [preparedQuiz] });
  renderGame();
  const user = await enter();
  await user.click(await screen.findByRole("button", { name: "進む" }));
  await waitFor(() => expect(state.save.run?.moves).toBe(1));
  expect(loadDungeonRegionQuizPool).toHaveBeenNthCalledWith(
    2,
    "book",
    1,
    undefined,
    true,
  );
  expect(state.save.content?.quizzes.map((quiz) => quiz.quiz_id)).toEqual([
    "quiz",
    "fixed-pool-quiz",
  ]);
  expect(markTanbunSeen).toHaveBeenCalledWith("sentence", true);
});

it("does not spend moves or record seen knowledge when population hydration fails", async () => {
  const pool = {
    ready: true,
    level: 1,
    required_quizzes: 5,
    available_quizzes: 5,
    quiz_ids: ["missing-quiz"],
    enemies: [],
  };
  vi.mocked(loadDungeonRegionQuizPool).mockResolvedValue(pool);
  renderGame();
  const user = await enter();
  await user.click(await screen.findByRole("button", { name: "進む" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "領域1のクイズを取得できませんでした",
  );
  expect(state.save.run?.moves).toBe(0);
  expect(markTanbunSeen).not.toHaveBeenCalled();
});

it("fullscreen is presentation-only and does not reset or save the adventure", async () => {
  state = {
    revision: 1,
    save: enterDungeon(newSave(), "book", "テストの本", 1),
  };
  const original = state.save;
  renderGame();
  const user = userEvent.setup();
  await screen.findByText("35/35");
  await user.click(screen.getByRole("button", { name: "マップを全画面表示" }));
  expect(
    within(screen.getByRole("dialog", { name: "冒険マップ" })).getByText(
      "35/35",
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
  renderGame("/game");
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
  renderGame("/game");
  const history = await screen.findByRole("combobox", {
    name: "過去のダンジョン",
  });
  expect(
    within(history).getByRole("option", { name: "以前の本 · 攻略2周" }),
  ).toBeInTheDocument();
});

it("shows an explicit empty history instead of hiding the section", async () => {
  renderGame("/game");
  expect(await screen.findByText("訪問履歴はまだありません。")).toBeVisible();
  expect(
    screen.getByRole("region", { name: "過去のダンジョン" }),
  ).toBeVisible();
});

it("explains when past dungeons are no longer available", async () => {
  state = { revision: 1, save: { ...newSave(), visitedDungeons: ["removed"] } };
  renderGame("/game");
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
  renderGame("/game");
  expect(await screen.findByText("35/35")).toBeVisible();
  expect(
    screen.queryByRole("combobox", { name: "過去のダンジョン" }),
  ).not.toBeInTheDocument();
  expect(state.save.run?.resourceId).toBe("book");
});

it.each([10, 3, 0])(
  "parks a dungeon and preserves HP/MP/location with MP maximum %i without a new right",
  async (maxMp) => {
    server.use(
      http.get("*/game/balance", () =>
        HttpResponse.json({ ...defaultBalance, base_mp: maxMp }),
      ),
    );
    const save = enterDungeon(newSave(), "book", "テストの本", 1);
    if (!save.run) throw new Error("Missing run");
    const content = await loadDungeon("book");
    state = {
      revision: 1,
      save: {
        ...save,
        visitedDungeons: ["book"],
        maps: {
          book: {
            current: ENTRANCE,
            places: [{ id: "sentence", region: 0 }],
            edges: [{ from: ENTRANCE, to: "sentence", kind: "detour" }],
          },
        },
        unlockedDungeons: [
          {
            sourceId: "book",
            resourceId: "previous",
            name: "以前の本",
            achievement: 3,
          },
        ],
        content,
        run: {
          ...save.run,
          hp: 24,
          mp: Math.min(1, maxMp),
          maxMp,
          moves: 2,
          readIds: ["sentence"],
        },
      },
    };
    available = false;
    renderGame();
    const user = userEvent.setup();
    expect(await screen.findByText("24/35")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "ダンジョンを切り替える" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "マップを全画面表示" }),
    );
    await user.click(
      screen.getByRole("button", { name: "ダンジョン 以前の本" }),
    );
    const unlocked = screen.getByRole("button", {
      name: "ダンジョン 以前の本",
    });
    expect(unlocked).not.toHaveTextContent("現在地");
    expect(unlocked).toHaveTextContent("達成度 0 · 開拓 0地点");
    await user.click(
      screen.getByRole("button", { name: "このダンジョンへ移動" }),
    );
    await waitFor(() => expect(state.save.run?.resourceId).toBe("previous"));
    expect(screen.getByRole("dialog", { name: "冒険マップ" })).toBeVisible();
    expect(state.save.dungeons?.book.run.hp).toBe(24);
    expect(state.save.maps?.book.current).toBe(ENTRANCE);
    expect(state.save.run?.hp).toBe(24);
    expect(state.save.run?.mp).toBe(Math.min(1, maxMp));
    expect(state.save.run?.maxMp).toBe(maxMp);
    expect(state.save.run?.moves).toBe(2);
    await user.click(
      screen.getByRole("button", { name: "ダンジョン テストの本" }),
    );
    await user.click(
      screen.getByRole("button", { name: "このダンジョンへ移動" }),
    );
    await waitFor(() => expect(state.save.run?.resourceId).toBe("book"));
    expect(await screen.findByText("24/35")).toBeVisible();
    expect(state.save.run?.moves).toBe(2);
    expect(state.save.maps?.book.current).toBe(ENTRANCE);
    expect(state.save.run?.mp).toBe(Math.min(1, maxMp));
    expect(consumeCount).toBe(0);
  },
);

it("uses the recovery place while alive, spending one move without another adventure right", async () => {
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  if (!save.run) throw new Error("Missing run");
  state = {
    revision: 1,
    save: {
      ...save,
      content: await loadDungeon("book"),
      run: { ...save.run, hp: 12, moves: 1 },
    },
  };
  available = false;
  renderGame();
  const user = userEvent.setup();
  expect(await screen.findByText("12/35")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "マップを全画面表示" }));
  const map = screen.getByRole("dialog", { name: "冒険マップ" });
  await user.click(within(map).getByRole("button", { name: "回復場所" }));
  await user.click(
    within(map).getByRole("button", { name: "回復場所へ移動・1歩" }),
  );
  await waitFor(() =>
    expect(state.save.run).toMatchObject({
      hp: 35,
      moves: 2,
      phase: "path",
    }),
  );
  expect(consumeCount).toBe(0);
});

it("shows unlocked dungeons and the recovery place only at the entrance", async () => {
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  if (!save.run) throw new Error("Missing run");
  state = {
    revision: 1,
    save: {
      ...save,
      visitedDungeons: ["book"],
      unlockedDungeons: [
        {
          sourceId: "book",
          resourceId: "previous",
          name: "以前の本",
          achievement: 3,
        },
      ],
      content: await loadDungeon("book"),
      run: { ...save.run, readIds: ["sentence"] },
    },
  };
  renderGame();
  const user = userEvent.setup();
  expect(await screen.findByText("35/35")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "マップを全画面表示" }));
  const map = screen.getByRole("dialog", { name: "冒険マップ" });
  expect(
    within(map).queryByRole("button", { name: "ダンジョン 以前の本" }),
  ).not.toBeInTheDocument();
  expect(
    within(map).queryByRole("button", { name: "回復場所" }),
  ).not.toBeInTheDocument();
});

it("admin unlock is applied without healing or erasing progress", async () => {
  automaticRecovery = true;
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

it("automatically fills remaining moves on clock recovery without pressing resume", async () => {
  automaticRecovery = true;
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  if (!save.run) throw new Error("Missing run");
  state = {
    revision: 1,
    save: { ...save, run: { ...save.run, hp: 24, moves: 2, kills: 1 } },
  };
  available = false;
  renderGame();
  await screen.findByLabelText("ダンジョン情報");
  expect(state.save.run?.moves).toBe(2);
  available = true;
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "冒険権を再確認" }));
  await waitFor(() => expect(state.save.run?.moves).toBe(0));
  expect(state.save.run).toMatchObject({ hp: 24, kills: 1, phase: "path" });
  expect(consumeCount).toBe(1);
});
