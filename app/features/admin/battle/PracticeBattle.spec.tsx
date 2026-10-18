import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import {
  defaultBalance,
  emptyAllocation,
  playerStats,
} from "~/features/game/battle";
import PracticeBattle from "./PracticeBattle";
import type {
  EnemyBalanceSimulation,
  PracticeInput,
  PracticeSession,
  SimulatedPracticeInput,
} from "./api";

vi.mock("~/features/tanbun/detail/Preview", () => ({
  useTanbunPreview: () => ({ openPreview: vi.fn(), preview: null }),
}));
vi.mock("~/features/quiz/QuizReportButton", () => ({
  default: () => <button type="button">本番の通報操作</button>,
}));
vi.mock("~/features/user/UserAvatar", () => ({
  default: ({
    user,
  }: { user?: { avatar_url?: string; display_name?: string } }) =>
    user?.avatar_url ? (
      <img alt={user.display_name ?? ""} src={user.avatar_url} />
    ) : null,
}));
const preparations: SimulatedPracticeInput[] = [];
const turns: unknown[] = [];
const draft = { ...defaultBalance, base_hp: 60, damage_variance_percent: 0 };
const trial: EnemyBalanceSimulation = {
  power: 250,
  achievement: 2,
  balance: defaultBalance,
  pool_quiz_count: 10,
  average_relations: 0,
  min_encounter_enemies: 1,
  max_encounter_enemies: 1,
  requested_enemy_types: 1,
  requested_quiz_count: 1,
  assigned_quiz_count: 1,
  unassigned_quiz_count: 9,
  warnings: [],
  enemies: [{ index: 1, quiz_count: 1, hp: 5, attack: 12, relations: 0 }],
};
const trials = [{ id: "trial", name: "試算 1", simulation: trial }];
const userPoints = { hp: 2, mp: 0, attack: 8, defense: 1 };
const server = setupServer(
  http.post(
    "*/admin/settings/game-balance/simulate-combat",
    async ({ request }) => {
      const input = await request.json();
      return HttpResponse.json({
        ...(input as object),
        damage_to_enemy: 10,
        damage_to_enemy_min: 10,
        damage_to_enemy_max: 10,
        damage_to_player: 11,
        damage_to_player_min: 11,
        damage_to_player_max: 11,
        correct_answers_to_defeat: 1,
        incorrect_answers_to_defeat: 6,
      });
    },
  ),
  http.get("*/admin/users/:uid/game/allocation", () =>
    HttpResponse.json(userPoints),
  ),
  http.get("*/admin/users", () =>
    HttpResponse.json([
      {
        uid: "user",
        email: "admin@test",
        display_name: "管理者",
        username: null,
        avatar_url: "https://example.com/admin.png",
      },
      {
        uid: "other",
        email: "player@test",
        display_name: "プレイヤーB",
        username: null,
        avatar_url: "https://example.com/player-b.png",
      },
    ]),
  ),
  http.get("*/admin/game/dungeons", () =>
    HttpResponse.json([
      {
        user_id: "user",
        user_email: "admin@test",
        resource_id: "book",
        resource_name: "模擬用の本",
        status: "path",
        region_count: 1,
        quiz_count: 1,
        regions: [{ level: 1, quizzes: [] }],
      },
    ]),
  ),
  http.post(
    "*/admin/settings/game-balance/practice/simulation",
    async ({ request }) => {
      const input = (await request.json()) as SimulatedPracticeInput;
      preparations.push(input);
      const points =
        input.allocation ??
        (input.player_user_id ? userPoints : emptyAllocation);
      const stats = playerStats(points, input.balance);
      const quiz = {
        quiz_id: "quiz",
        quiz_type: "sent2term",
        prompt: { subject: "模擬問題", answer_kind: "term" },
        statement: "説明",
        options: { yes: "正解の選択肢", no: "誤答の選択肢" },
        correct: ["yes"],
        no_correct_option: false,
        created: "2026-10-12T00:00:00Z",
      };
      return HttpResponse.json({
        seed: input.seed,
        server_now: Date.now(),
        context: {
          balance: input.balance,
          enemies: [
            {
              id: "enemy",
              name: "模擬敵",
              quizIndex: 0,
              quizIndexes: [0],
              hp: input.simulation.enemies[0].hp,
              attack: input.simulation.enemies[0].attack,
              relations: 0,
              region: 0,
            },
          ],
        },
        state: {
          revision: 0,
          save: {
            version: 2,
            clears: {},
            allocation: points,
            content: { knowledge: [], quizzes: [quiz] },
            run: {
              resourceId: "book",
              name: "模擬用の本",
              hp: stats.maxHp,
              ...stats,
              moves: 0,
              kills: 0,
              enemyHp: 0,
              enemyMaxHp: 1,
              quizCursor: 0,
              readIds: [],
              phase: "battle",
              answerDeadline: Date.now() + stats.answerSeconds * 1000,
            },
            battle: {
              id: "practice-1",
              turn: 0,
              region: 0,
              checkpoint: "@entrance",
              enemies: ["enemy"],
              quizIndices: { enemy: 0 },
            },
          },
        },
      });
    },
  ),
  http.post(
    "*/admin/settings/game-balance/practice/turn",
    async ({ request }) => {
      const body = (await request.json()) as {
        session: PracticeSession;
        turn: { answers: Record<string, string[]>; retreat: boolean };
      };
      turns.push(body);
      const correct = body.turn.answers.enemy?.includes("yes") ?? false;
      return HttpResponse.json({
        damage: correct ? 0 : 11,
        results: Object.fromEntries(
          Object.keys(body.turn.answers).map((id) => [id, correct]),
        ),
        state: {
          ...body.session.state,
          save: {
            ...body.session.state.save,
            battle: null,
            battleFeedback: "模擬ターン精算",
            run: {
              ...body.session.state.save.run,
              hp: correct ? 60 : 49,
              phase: "path",
            },
          },
        },
      });
    },
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  preparations.length = 0;
  turns.length = 0;
  vi.restoreAllMocks();
});
afterAll(() => server.close());

it("selects a player's appearance while using draft initial stats and the enemy trial", async () => {
  render(
    <MemoryRouter>
      <PracticeBattle settings={draft} trials={trials} />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  const player = screen.getByRole("combobox", { name: "プレイヤー" });
  await waitFor(() => expect(player).toBeEnabled());
  await screen.findByRole("option", { name: /プレイヤーB/ });
  await user.selectOptions(player, "other");
  const start = screen.getByRole("button", {
    name: "現在の設定で模擬戦を開始",
  });
  await waitFor(() => expect(start).toBeEnabled());
  expect(screen.getByLabelText("攻ポイント")).toBeDisabled();
  expect(
    screen.getByRole("checkbox", { name: "実プレイヤーの割り振りを使用" }),
  ).toBeChecked();
  await user.click(start);
  await screen.findByRole("heading", { name: "模擬戦（保存されません）" });
  expect(document.querySelector('img[alt="プレイヤーB"]')).toHaveAttribute(
    "src",
    "https://example.com/player-b.png",
  );
  expect(preparations[0]).toMatchObject({
    balance: draft,
    simulation: trial,
    allocation: null,
    player_user_id: "other",
  });
  expect(preparations[0].seed).toEqual(expect.any(Number));
  expect(screen.getByRole("region", { name: "プレイヤー" })).toHaveTextContent(
    /HP\s*70\/70/,
  );
});

it("explains a missing deployment route without confusing it with missing data", async () => {
  server.use(
    http.post("*/admin/settings/game-balance/practice/simulation", () =>
      HttpResponse.json({ detail: "Not Found" }, { status: 404 }),
    ),
  );
  render(
    <MemoryRouter>
      <PracticeBattle settings={draft} trials={trials} />
    </MemoryRouter>,
  );
  const start = screen.getByRole("button", {
    name: "現在の設定で模擬戦を開始",
  });
  await waitFor(() => expect(start).toBeEnabled());
  await userEvent.setup().click(start);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "模擬戦APIがサーバーに未反映",
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("keeps practice visible before any trial and can use a real dungeon", async () => {
  let requestInput: PracticeInput | undefined;
  server.use(
    http.post("*/admin/settings/game-balance/practice", async ({ request }) => {
      requestInput = (await request.json()) as PracticeInput;
      return HttpResponse.json(
        { detail: "ダンジョンの条件を確認" },
        { status: 409 },
      );
    }),
  );
  render(
    <MemoryRouter>
      <PracticeBattle settings={draft} />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: "実戦形式の模擬戦" }),
  ).toBeVisible();
  const user = userEvent.setup();
  const start = screen.getByRole("button", {
    name: "現在の設定で模擬戦を開始",
  });
  await screen.findByRole("option", { name: /プレイヤーB/ });
  await user.selectOptions(screen.getByLabelText("プレイヤー"), "other");
  await waitFor(() => expect(start).toBeEnabled());
  await user.click(start);
  await screen.findByText("ダンジョンの条件を確認");
  expect(requestInput).toMatchObject({
    user_id: "user",
    player_user_id: "other",
    resource_id: "book",
    level: 1,
    balance: draft,
    allocation: null,
  });
  expect(requestInput?.seed).toEqual(expect.any(Number));
  expect(preparations).toHaveLength(0);
});

it("answers the real dungeon quiz by keyboard through practice endpoints only", async () => {
  server.use(
    http.post("*/admin/settings/game-balance/practice", () => {
      const stats = playerStats(emptyAllocation, draft);
      return HttpResponse.json({
        seed: 1,
        server_now: Date.now(),
        context: {
          balance: draft,
          enemies: [
            {
              id: "enemy",
              name: "実ダンジョンの敵",
              quizIndex: 0,
              hp: 5,
              attack: 12,
              region: 0,
            },
          ],
        },
        state: {
          revision: 0,
          save: {
            version: 2,
            clears: {},
            allocation: emptyAllocation,
            content: {
              knowledge: [],
              quizzes: [
                {
                  quiz_id: "real-quiz",
                  quiz_type: "sent2term",
                  prompt: {
                    subject: "実ダンジョンの問題",
                    answer_kind: "term",
                  },
                  statement: "実ダンジョンの説明",
                  options: { yes: "本来の正答", no: "本来の誤答" },
                  correct: ["yes"],
                  no_correct_option: false,
                  created: "2026-10-16T00:00:00Z",
                },
              ],
            },
            run: {
              resourceId: "book",
              name: "模擬用の本",
              ...stats,
              hp: stats.maxHp,
              mp: stats.maxMp,
              moves: 0,
              kills: 0,
              enemyHp: 0,
              enemyMaxHp: 1,
              quizCursor: 0,
              readIds: [],
              phase: "battle",
              answerDeadline: Date.now() + stats.answerSeconds * 1000,
            },
            battle: {
              id: "dungeon-practice",
              turn: 0,
              region: 0,
              checkpoint: "@entrance",
              enemies: ["enemy"],
              quizIndices: { enemy: 0 },
            },
          },
        },
      });
    }),
  );
  render(
    <MemoryRouter>
      <PracticeBattle settings={draft} />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  const start = screen.getByRole("button", {
    name: "現在の設定で模擬戦を開始",
  });
  await waitFor(() => expect(start).toBeEnabled());
  await user.click(start);
  await screen.findByRole("heading", { name: "模擬戦（保存されません）" });
  expect(
    screen.queryByText("模擬回答：正解か不正解を選択してください。"),
  ).not.toBeInTheDocument();
  screen.getByRole("button", { name: "本来の正答" }).focus();
  await user.keyboard(" {Enter}");
  await user.click(
    await screen.findByRole("button", { name: "結果を処理 · 1/1" }),
  );
  await screen.findByRole("button", { name: "続ける" });
  expect(turns).toHaveLength(1);
  expect(turns[0]).toMatchObject({ turn: { answers: { enemy: ["yes"] } } });
  expect(
    screen.queryByRole("button", { name: "本番の通報操作" }),
  ).not.toBeInTheDocument();
});

it("loads real points and edits only the disposable player before starting", async () => {
  render(
    <MemoryRouter>
      <PracticeBattle settings={draft} trials={trials} />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await screen.findByRole("option", { name: /プレイヤーB/ });
  await user.selectOptions(screen.getByLabelText("プレイヤー"), "other");
  const attack = screen.getByLabelText("攻ポイント");
  await waitFor(() => expect(attack).toHaveValue(8));
  await user.click(
    screen.getByRole("checkbox", { name: "実プレイヤーの割り振りを使用" }),
  );
  expect(attack).toBeEnabled();
  await user.clear(attack);
  await user.type(attack, "9");
  expect(
    screen.getByText(
      /プレイヤー: HP 70 · MP 10 · 攻 28 · 守 2 · 速さ 10 · 45秒/,
    ),
  ).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "現在の設定で模擬戦を開始" }),
  );
  await screen.findByRole("dialog");
  expect(preparations[0].allocation).toEqual({
    ...userPoints,
    attack: 9,
    speed: 0,
  });
  expect(preparations[0].player_user_id).toBe("other");
  expect(screen.getByRole("region", { name: "プレイヤー" })).toHaveTextContent(
    /HP\s*70\/70/,
  );
});

it("uses real battle UI with draft settings, records results and replays without live writes", async () => {
  render(
    <MemoryRouter>
      <PracticeBattle settings={draft} trials={trials} />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  const start = screen.getByRole("button", {
    name: "現在の設定で模擬戦を開始",
  });
  await waitFor(() => expect(start).toBeEnabled());
  await user.click(start);
  expect(
    await screen.findByRole("heading", { name: "模擬戦（保存されません）" }),
  ).toBeInTheDocument();
  expect(preparations[0].balance).toEqual(draft);
  expect(screen.getByRole("region", { name: "プレイヤー" })).toHaveTextContent(
    /HP\s*60\/60/,
  );
  expect(
    screen.queryByRole("button", { name: "本番の通報操作" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("正解の選択肢")).not.toBeInTheDocument();
  expect(screen.queryByText("模擬問題")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "正解" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await user.click(
    await screen.findByRole("button", { name: "結果を処理 · 1/1" }),
  );
  await screen.findByRole("button", { name: "続ける" });
  expect(screen.getByLabelText("模擬敵へのダメージ")).toHaveTextContent(
    "HIT · 10ダメージ",
  );
  expect(screen.queryByTitle("単文詳細を開く")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "続ける" }));
  const comparison = screen.getByRole("table", { name: "模擬戦の比較" });
  expect(comparison).toHaveTextContent("勝利");
  expect(
    screen.queryByRole("table", { name: "想定と実績" }),
  ).not.toBeInTheDocument();
  expect(turns).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "同じ条件で再戦" }));
  expect(preparations).toHaveLength(1);
  expect(screen.getByRole("region", { name: "プレイヤー" })).toHaveTextContent(
    /HP\s*60\/60/,
  );
});

it("confirms an incorrect synthetic answer and applies incoming damage", async () => {
  render(
    <MemoryRouter>
      <PracticeBattle settings={draft} trials={trials} />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  const start = screen.getByRole("button", {
    name: "現在の設定で模擬戦を開始",
  });
  await waitFor(() => expect(start).toBeEnabled());
  await user.click(start);
  await user.click(await screen.findByRole("button", { name: "不正解" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await user.click(
    await screen.findByRole("button", { name: "結果を処理 · 1/1" }),
  );
  await screen.findByText("模擬敵 · 不正解");
  expect(screen.getByText("模擬敵 · 不正解")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "プレイヤー" })).toHaveTextContent(
    /HP\s*49\/60/,
  );
  expect(turns).toHaveLength(1);
  expect(turns[0]).toMatchObject({ turn: { answers: { enemy: [] } } });
  expect(screen.queryByText("正解の選択肢")).not.toBeInTheDocument();
});

it("summarizes multiple turns using the original player stats", async () => {
  server.use(
    http.post(
      "*/admin/settings/game-balance/practice/turn",
      async ({ request }) => {
        const body = (await request.json()) as {
          session: PracticeSession;
          turn: { defeated: string[] };
        };
        const state = structuredClone(body.session.state);
        if (body.turn.defeated.includes("enemy")) state.save.battle = null;
        return HttpResponse.json({
          state,
          results: { enemy: true },
          damage: 0,
        });
      },
    ),
    http.post(
      "*/admin/settings/game-balance/practice/next",
      async ({ request }) => {
        const input = (await request.json()) as PracticeSession;
        const state = structuredClone(input.state);
        if (state.save.battle) state.save.battle.turn++;
        return HttpResponse.json(state);
      },
    ),
  );
  const strongerTrial = {
    ...trial,
    enemies: [{ ...trial.enemies[0], hp: 25 }],
  };
  render(
    <MemoryRouter>
      <PracticeBattle
        settings={draft}
        trials={[{ ...trials[0], simulation: strongerTrial }]}
      />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  const start = screen.getByRole("button", {
    name: "現在の設定で模擬戦を開始",
  });
  await waitFor(() => expect(start).toBeEnabled());
  await user.click(start);
  for (let turn = 0; turn < 3; turn++) {
    await user.click(await screen.findByRole("button", { name: "正解" }));
    await user.click(screen.getByRole("button", { name: "回答を確定" }));
    await user.click(
      await screen.findByRole("button", { name: "結果を処理 · 1/1" }),
    );
    if (turn < 2)
      await user.click(
        await screen.findByRole("button", { name: "次のターン" }),
      );
  }
  await user.click(await screen.findByRole("button", { name: "続ける" }));
  expect(
    screen.queryByRole("table", { name: "想定と実績" }),
  ).not.toBeInTheDocument();
  const comparison = screen.getByRole("table", { name: "模擬戦の比較" });
  const headers = within(comparison)
    .getAllByRole("columnheader")
    .map((header) => header.textContent);
  const row = within(comparison).getAllByRole("row")[1];
  const cells = within(row).getAllByRole("cell");
  const result = Object.fromEntries(
    headers.map((header, index) => [header, cells[index]?.textContent]),
  );
  expect(result.プレイヤー).toBe("HP 60／攻 10／守 1／45秒");
  expect(result.勝敗).toBe("勝利");
  expect(result.ターン).toBe("3");
  expect(result.正解).toBe("3");
  expect(result.被ダメージ).toBe("0");
});

it("settles unanswered timeout through practice and reports count, damage, and time", async () => {
  render(
    <MemoryRouter>
      <PracticeBattle settings={draft} trials={trials} />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  const start = screen.getByRole("button", {
    name: "現在の設定で模擬戦を開始",
  });
  await waitFor(() => expect(start).toBeEnabled());
  await user.click(start);
  await screen.findByRole("timer");
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now + 60000);
  await user.click(
    await screen.findByRole("button", { name: "結果を処理 · 1/1" }),
  );
  await screen.findByRole("button", { name: "続ける" });
  await user.click(screen.getByRole("button", { name: "続ける" }));
  const row = within(
    screen.getByRole("table", { name: "模擬戦の比較" }),
  ).getAllByRole("row")[1];
  const headers = within(screen.getByRole("table", { name: "模擬戦の比較" }))
    .getAllByRole("columnheader")
    .map((header) => header.textContent);
  const cells = within(row).getAllByRole("cell");
  const result = Object.fromEntries(
    headers.map((header, index) => [header, cells[index]?.textContent]),
  );
  expect(result.未回答).toBe("1");
  expect(result.被ダメージ).toBe("11");
  expect(result.回答時間).toBe("45.0秒");
  expect(turns).toHaveLength(1);
});
