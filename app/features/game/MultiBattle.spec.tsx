import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import MultiBattle from "./MultiBattle";
import type { DungeonContent } from "./api";
import { type BattleTransport, type TurnInput, defaultBalance } from "./battle";
import * as battleSound from "./battleSound";
import { normalizeSkill } from "./catalog";
import { sampleCatalog } from "./catalog.fixtures";
import { type GameSave, enterDungeon, newSave } from "./domain";
import { setMusicPreferences } from "./music";

vi.mock("~/features/quiz/QuizPreviewPrompt", () => ({
  default: () => <p>解答後の詳細プレビュー</p>,
}));
vi.mock("~/features/quiz/QuizReportButton", () => ({ default: () => null }));
const requests: TurnInput[] = [];
let failures = 0;
const server = setupServer(
  http.post("*/game/battle/turn", async ({ request }) => {
    const body = (await request.json()) as TurnInput;
    requests.push(body);
    if (failures-- > 0)
      return HttpResponse.json({ detail: "通信失敗" }, { status: 503 });
    return HttpResponse.json({
      results: Object.fromEntries(
        Object.keys(body.answers).map((id) => [id, true]),
      ),
      damage: 0,
      state: {
        revision: 2,
        save: {
          ...initial(),
          battle: null,
          run: { ...initial().run, phase: "path" },
          battleFeedback: "ターン精算完了",
        },
      },
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  requests.length = 0;
  failures = 0;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const name = this.getAttribute("aria-label") ?? this.textContent;
      let x = 0;
      let y = 0;
      let width = 0;
      if (name === "敵0" || name === "敵1") {
        x = name === "敵1" ? 200 : 0;
        width = 180;
      } else if (
        this.matches("[data-simulation-option], [data-quiz-option-index]")
      ) {
        x = name === "不正解" ? 200 : 0;
        y = 150;
        width = 180;
      } else if (this.matches("[data-battle-submit], [data-quiz-submit]")) {
        y = 250;
        width = 180;
      }
      return {
        x,
        y,
        width,
        height: width ? 50 : 0,
        top: y,
        bottom: y + (width ? 50 : 0),
        left: x,
        right: x + width,
        toJSON: () => ({}),
      };
    },
  );
});
afterEach(() => {
  vi.useRealTimers();
  server.resetHandlers();
  vi.restoreAllMocks();
});

it("automatically processes unanswered damage without a tempo control or advancing the turn", async () => {
  setMusicPreferences({ enabled: false });
  const playSound = vi.spyOn(battleSound, "playBattleSound");
  server.use(
    http.post("*/game/battle/turn", async ({ request }) => {
      requests.push((await request.json()) as TurnInput);
      const save = initial();
      save.battle = null;
      if (save.run) save.run.hp = 24;
      save.battleFeedback = "精算完了";
      return HttpResponse.json({
        state: { revision: 2, save },
        results: {},
        damage: 11,
        incoming_damage: { enemy0: 5, enemy1: 6 },
      });
    }),
  );
  const view = render(<Fixture deadline={Date.now() + 30} />);
  await screen.findByRole("button", { name: "結果を処理 · 1/2" });
  vi.useFakeTimers();
  const dialog = screen.getByRole("dialog", { name: "敵と遭遇" });
  const bgm = within(dialog).getByRole("button", { name: "BGM" });
  fireEvent.click(bgm);
  expect(bgm).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.queryByRole("combobox", { name: "戦闘テンポ" }),
  ).not.toBeInTheDocument();
  view.rerender(<Fixture resultSeconds={0.5} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(499);
  });
  expect(screen.getByRole("region", { name: "プレイヤー" })).toHaveTextContent(
    "35/35",
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(screen.getByText("敵0 · 未回答")).toBeVisible();
  expect(
    screen
      .getByRole("region", { name: "プレイヤー" })
      .querySelector('[data-skill-animation="impact"]'),
  ).not.toBeNull();
  expect(
    screen.getByLabelText("敵0からプレイヤーへのダメージ"),
  ).toHaveTextContent("5ダメージ");
  expect(screen.getByRole("region", { name: "プレイヤー" })).toHaveTextContent(
    "30/35",
  );
  fireEvent.click(bgm);
  expect(bgm).toHaveAttribute("aria-pressed", "false");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(500);
  });
  expect(screen.getByText("敵1 · 未回答")).toBeVisible();
  expect(screen.getByRole("region", { name: "プレイヤー" })).toHaveTextContent(
    "24/35",
  );
  expect(screen.getByRole("button", { name: "続ける" })).toBeEnabled();
  expect(playSound).toHaveBeenCalledTimes(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(requests).toHaveLength(1);
  playSound.mockRestore();
});
afterAll(() => server.close());
const content: DungeonContent = {
  knowledge: [],
  quizzes: ["一", "二"].map((text, index) => ({
    quiz_id: `q${index}`,
    quiz_type: "sent2term",
    statement: "説明",
    prompt: { subject: `問題${text}`, answer_kind: "term" },
    options: { [`a${index}`]: `選択肢${text}` },
    correct: [`a${index}`],
    no_correct_option: false,
    created: "2026-10-10T00:00:00Z",
  })),
};
const enemies = [0, 1].map((index) => ({
  id: `enemy${index}`,
  name: `敵${index}`,
  quizIndex: index,
  hp: 10,
  attack: 12,
  mp: 8,
  special_attack: 20,
  special_defense: 5,
  relations: 0,
  region: 2,
}));
const stableBalance = { ...defaultBalance, damage_variance_percent: 0 };

it("shows only HP on compact enemy cards", async () => {
  render(<Fixture />);
  const enemies = await screen.findByLabelText("敵一覧");
  expect(enemies).toHaveTextContent("HP");
  expect(enemies).not.toHaveTextContent(/MP|特攻|特守|速さ/);
});
function initial(deadline = Date.now() + 45000): GameSave {
  const save = enterDungeon(newSave(), "book", "本", 1);
  if (!save.run) throw new Error("Missing run");
  return {
    ...save,
    content,
    run: {
      ...save.run,
      phase: "battle",
      answerDeadline: deadline,
      answerSeconds: 45,
    },
    battle: {
      id: "battle",
      turn: 0,
      region: 2,
      checkpoint: "@entrance",
      enemies: enemies.map((enemy) => enemy.id),
    },
  };
}
function Fixture({
  deadline,
  resultSeconds = 1,
}: { deadline?: number; resultSeconds?: number }) {
  const [save, setSave] = useState(() => initial(deadline));
  return (
    <MemoryRouter>
      <MultiBattle
        save={save}
        content={content}
        context={{
          balance: {
            ...stableBalance,
            battle_tempo_medium_seconds: resultSeconds,
          },
          enemies,
        }}
        onSaved={(state) => setSave(state.save)}
        onFinished={async () => undefined}
        onBusy={() => undefined}
      />
    </MemoryRouter>
  );
}
it("plays a completed skill once on its target and respects the shared music switch", () => {
  setMusicPreferences({ enabled: true });
  const play = vi
    .spyOn(battleSound, "playSkillSound")
    .mockImplementation(() => undefined);
  const save = initial();
  const receipt = {
    action_id: "cast-1",
    animation: "heal" as const,
    effect: "heal_hp" as const,
    sound: "heal" as const,
    target_ids: ["player"],
  };
  const show = (state: GameSave) => (
    <MemoryRouter>
      <MultiBattle
        save={state}
        content={content}
        context={{ balance: stableBalance, enemies }}
        onSaved={() => undefined}
        onFinished={async () => undefined}
        onBusy={() => undefined}
      />
    </MemoryRouter>
  );
  const view = render(show(save));
  view.rerender(show({ ...save, endActionReceipt: receipt }));
  expect(play).toHaveBeenCalledOnce();
  expect(play).toHaveBeenCalledWith(
    expect.objectContaining({ effect: "heal_hp", sound: "heal" }),
  );
  expect(
    screen
      .getByRole("region", { name: "プレイヤー" })
      .querySelector('[data-skill-animation="heal"]'),
  ).not.toBeNull();
  view.rerender(show({ ...save, endActionReceipt: { ...receipt } }));
  expect(play).toHaveBeenCalledOnce();
  act(() => setMusicPreferences({ enabled: false }));
  view.rerender(
    show({ ...save, endActionReceipt: { ...receipt, action_id: "cast-2" } }),
  );
  expect(play).toHaveBeenCalledOnce();
});
it("drops weapon damage after its last correct attack within the same turn", async () => {
  const save = initial();
  save.economy = {
    gold: 0,
    inventory: { sword: 1 },
    weapon: "sword",
    weapon_attack: 50,
    remaining_uses: { sword: 1 },
    weapon_max_uses: 30,
  };
  const transport = vi.fn(async (_path: string, body: unknown) => {
    requests.push(body as TurnInput);
    return {
      results: { enemy0: true, enemy1: true },
      damage: 0,
      state: { revision: 1, save },
    };
  });
  render(
    <MemoryRouter>
      <MultiBattle
        save={save}
        content={content}
        context={{
          balance: stableBalance,
          enemies: enemies.map((e) => ({ ...e, hp: 30 })),
        }}
        transport={transport as BattleTransport}
        rollDamage={(attack) => attack}
        onSaved={() => undefined}
        onFinished={async () => undefined}
        onBusy={() => undefined}
      />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "選択肢一" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await user.click(screen.getByRole("button", { name: "選択肢二" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0].defeated).toEqual(["enemy0"]);
});
it("locks synthetic answers per enemy and supports quizzes with no correct option", async () => {
  const simulatedContent = structuredClone(content);
  simulatedContent.quizzes[1].no_correct_option = true;
  simulatedContent.quizzes[1].correct = [];
  const transport = vi.fn(async (_path: string, body: unknown) => {
    requests.push(body as TurnInput);
    return {
      results: { enemy0: true, enemy1: false },
      damage: 11,
      state: { revision: 1, save: { ...initial(), battle: null } },
    };
  });
  render(
    <MemoryRouter>
      <MultiBattle
        save={initial()}
        content={simulatedContent}
        context={{ balance: stableBalance, enemies }}
        simulation
        transport={transport as BattleTransport}
        onSaved={() => undefined}
        onFinished={async () => undefined}
        onBusy={() => undefined}
      />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "正解" }));
  expect(transport).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  expect(screen.queryByRole("button", { name: "敵0" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "不正解" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "不正解" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
  expect(requests[0].answers).toEqual({ enemy0: ["a0"], enemy1: ["a1"] });
});
it("uses sealed turn assignments immediately even while context still has the old question", async () => {
  function AssignedFixture() {
    const save = initial();
    if (save.battle) {
      save.battle.enemies = ["enemy0"];
      save.battle.quizIndices = { enemy0: 1 };
    }
    return (
      <MemoryRouter>
        <MultiBattle
          save={save}
          content={content}
          context={{ balance: stableBalance, enemies }}
          onSaved={() => undefined}
          onFinished={async () => undefined}
          onBusy={() => undefined}
        />
      </MemoryRouter>
    );
  }
  render(<AssignedFixture />);
  expect(
    screen.queryByRole("button", { name: "選択肢一" }),
  ).not.toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "選択肢二" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0].answers).toEqual({ enemy0: ["a1"] });
  expect(requests[0].defeated).toEqual(["enemy0"]);
});
it("confirms locally without revealing correctness, locks answers, and sends once at turn end", async () => {
  const user = userEvent.setup();
  render(<Fixture />);
  await user.click(screen.getByRole("button", { name: "選択肢一" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  expect(requests).toHaveLength(0);
  expect(screen.queryByText("正解です")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "敵0" })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "選択肢一" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "選択肢二" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await user.click(
    await screen.findByRole("button", { name: "結果を処理 · 1/2" }),
  );
  expect(screen.getByLabelText("敵0のHP")).toHaveTextContent("HP 0/10");
  expect(
    screen
      .getByLabelText("敵0")
      .querySelector('[data-skill-animation="impact"]'),
  ).not.toBeNull();
  expect(screen.getByLabelText("敵1のHP")).toHaveTextContent("HP 10/10");
  expect(screen.queryByText("ターン精算完了")).not.toBeInTheDocument();
  expect(screen.getAllByText("解答後の詳細プレビュー")).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "結果を処理 · 2/2" }));
  expect(screen.queryByText("ターン精算完了")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "続ける" })).toBeVisible();
  expect(requests).toEqual([
    {
      battle_id: "battle",
      turn: 0,
      answers: { enemy0: ["a0"], enemy1: ["a1"] },
      defeated: ["enemy0", "enemy1"],
      retreat: false,
    },
  ]);
  expect(screen.getAllByText("解答後の詳細プレビュー")).toHaveLength(2);
});
it("applies the pinned skill to only its target using the normal quiz answers", async () => {
  const user = userEvent.setup();
  const save = initial();
  if (!save.battle) throw new Error("Missing battle");
  save.battle.gambitAction = {
    name: "ファイア",
    item_id: null,
    skill: { ...sampleCatalog.skills[0], multiplier: 2 },
  };
  render(
    <MemoryRouter>
      <MultiBattle
        save={save}
        content={content}
        context={{
          balance: stableBalance,
          enemies: enemies.map((enemy) => ({ ...enemy, hp: 15 })),
        }}
        onSaved={() => undefined}
        onFinished={async () => undefined}
        onBusy={() => undefined}
      />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole("button", { name: "選択肢一" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await user.click(screen.getByRole("button", { name: "選択肢二" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await user.click(
    await screen.findByRole("button", { name: "結果を処理 · 1/2" }),
  );
  expect(requests[0].defeated).toEqual(["enemy0"]);
  expect(screen.getByLabelText("敵0のHP")).toHaveTextContent("HP 0/15");
  await user.click(screen.getByRole("button", { name: "結果を処理 · 2/2" }));
  expect(screen.getByLabelText("敵1のHP")).toHaveTextContent("HP 5/15");
});
it.each([1, 2, 10000])(
  "uses attack buffs only on their active turns (turn=%s)",
  async (turn) => {
    const user = userEvent.setup();
    const save = initial();
    if (!save.battle) throw new Error("Missing battle");
    save.battle.turn = turn;
    save.battle.effects = [
      {
        skill: normalizeSkill({
          ...sampleCatalog.skills[0],
          id: "boost",
          name: "攻撃強化",
          effect: "buff",
          target: "self",
          stat: "attack",
          amount_mode: "percent",
          amount: 50,
          duration_turns: turn === 10000 ? "infinite" : 1,
        }),
        target_id: "player",
        starts_turn: 1,
        expires_turn: turn === 10000 ? null : 2,
      },
    ];
    render(
      <MemoryRouter>
        <MultiBattle
          save={save}
          content={content}
          context={{
            balance: stableBalance,
            enemies: enemies.map((e) => ({ ...e, hp: 15 })),
          }}
          onSaved={() => undefined}
          onFinished={async () => undefined}
          onBusy={() => undefined}
        />
      </MemoryRouter>,
    );
    if (turn === 1)
      expect(screen.getByLabelText("戦闘中の効果")).toHaveTextContent(
        "あと1行動",
      );
    else if (turn === 10000)
      expect(screen.getByLabelText("戦闘中の効果")).toHaveTextContent(
        "持続数 無限",
      );
    else
      expect(screen.queryByLabelText("戦闘中の効果")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "選択肢一" }));
    await user.click(screen.getByRole("button", { name: "回答を確定" }));
    await user.click(screen.getByRole("button", { name: "選択肢二" }));
    await user.click(screen.getByRole("button", { name: "回答を確定" }));
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0].defeated).toEqual(
      turn !== 2 ? ["enemy0", "enemy1"] : [],
    );
  },
);
it("processes poison after attacks and stops it at HP one without counting a kill", async () => {
  const save = initial();
  if (!save.battle) throw new Error("Missing battle");
  save.battle.turn = 1;
  save.battle.effects = enemies.map((e) => ({
    skill: normalizeSkill({
      ...sampleCatalog.skills[0],
      effect: "ailment" as const,
      amount: 100,
    }),
    target_id: e.id,
    starts_turn: 1,
    expires_turn: 3,
  }));
  server.use(
    http.post("*/game/battle/turn", async ({ request }) => {
      requests.push((await request.json()) as TurnInput);
      return HttpResponse.json({
        results: { enemy0: true, enemy1: false },
        damage: 3,
        incoming_damage: { enemy1: 3 },
        poison_damage: { enemy0: 100, enemy1: 100 },
        state: { revision: 2, save: { ...save, battleFeedback: "精算完了" } },
      });
    }),
  );
  render(
    <MemoryRouter>
      <MultiBattle
        save={save}
        content={content}
        context={{
          balance: stableBalance,
          enemies: enemies.map((e, i) => ({ ...e, hp: i === 0 ? 20 : 2 })),
        }}
        simulation
        onSaved={() => undefined}
        onFinished={async () => undefined}
        onBusy={() => undefined}
      />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "正解" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await user.click(screen.getByRole("button", { name: "不正解" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await user.click(
    await screen.findByRole("button", { name: "結果を処理 · 1/2" }),
  );
  expect(requests[0].defeated).toEqual([]);
  expect(screen.getByLabelText("敵0のHP")).toHaveTextContent("HP 1/20");
  expect(screen.getByLabelText("敵0の毒ダメージ")).toHaveTextContent(
    "9ダメージ",
  );
  await user.click(screen.getByRole("button", { name: "結果を処理 · 2/2" }));
  expect(screen.getByLabelText("敵1のHP")).toHaveTextContent("HP 1/2");
  expect(screen.getByLabelText("敵1の毒ダメージ")).toHaveTextContent(
    "1ダメージ",
  );
});
it("seals the timed-out turn and retries the same payload", async () => {
  failures = 1;
  render(<Fixture deadline={Date.now() + 30} />);
  await screen.findByText("通信失敗");
  expect(requests).toHaveLength(1);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "精算を再試行" }));
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "結果を処理 · 1/2" }),
  );
  await user.click(screen.getByRole("button", { name: "結果を処理 · 2/2" }));
  expect(screen.queryByText("ターン精算完了")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "続ける" })).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[0].answers).toEqual({});
});

it("preserves sealed answers and damage draws after a browser network failure", async () => {
  server.use(
    http.post("*/game/battle/turn", async ({ request }) => {
      const input = (await request.json()) as TurnInput;
      requests.push(input);
      if (requests.length === 1) return HttpResponse.error();
      return HttpResponse.json({
        results: { enemy0: true, enemy1: true },
        damage: 0,
        state: { revision: 2, save: { ...initial(), battle: null } },
      });
    }),
  );
  render(<Fixture />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "選択肢一" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await user.click(screen.getByRole("button", { name: "選択肢二" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await screen.findByText(
    "サーバーに接続できませんでした。接続を確認して再試行してください。",
  );
  expect(requests).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "精算を再試行" }));
  await screen.findByRole("button", { name: "結果を処理 · 1/2" });
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
});
it("retreat batches only confirmed answers and keeps unanswered questions out of history", async () => {
  render(<Fixture />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "選択肢一" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await user.click(screen.getByRole("button", { name: "撤退する" }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0].retreat).toBe(true);
  expect(requests[0].answers).toEqual({ enemy0: ["a0"] });
});

it.each([false, true])(
  "answers consecutive turns entirely by keyboard (simulation=%s)",
  async (simulation) => {
    server.use(
      http.post("*/game/battle/turn", async ({ request }) => {
        const body = (await request.json()) as TurnInput;
        requests.push(body);
        const save = initial();
        if (!save.battle) throw new Error("Missing battle");
        save.battle.turn = body.turn + 1;
        save.battle.enemies = save.battle.enemies.filter(
          (id) => !body.defeated.includes(id),
        );
        save.battleFeedback = "ターン精算完了";
        if (save.run) save.run.answerDeadline = undefined;
        return HttpResponse.json({
          results: { enemy0: true, enemy1: true },
          damage: 0,
          state: { revision: 2, save },
        });
      }),
      http.post("*/game/battle/next", () => {
        const save = initial();
        if (save.battle) {
          save.battle.turn = 1;
          save.battle.quizIndices = { enemy0: 1, enemy1: 0 };
        }
        return HttpResponse.json({ revision: 3, save });
      }),
    );
    function TwoTurnFixture() {
      const [save, setSave] = useState(initial);
      return (
        <MemoryRouter>
          <MultiBattle
            simulation={simulation}
            save={save}
            content={content}
            context={{
              balance: stableBalance,
              enemies: enemies.map((enemy) => ({ ...enemy, hp: 15 })),
            }}
            onSaved={(state) => setSave(state.save)}
            onFinished={async () => undefined}
            onBusy={() => undefined}
          />
        </MemoryRouter>
      );
    }
    render(<TwoTurnFixture />);
    const user = userEvent.setup();
    async function answerBoth(reverse = false) {
      const first = await screen.findByRole("button", {
        name: simulation ? "正解" : reverse ? "選択肢二" : "選択肢一",
      });
      await waitFor(() => expect(first).toHaveFocus());
      await user.keyboard(" {Enter}");
      const second = screen.getByRole("button", {
        name: simulation ? "正解" : reverse ? "選択肢一" : "選択肢二",
      });
      await waitFor(() => expect(second).toHaveFocus());
      if (simulation) {
        await user.keyboard("{ArrowRight}");
        expect(screen.getByRole("button", { name: "不正解" })).toHaveFocus();
        await user.keyboard("{ArrowLeft}");
      }
      await user.keyboard(" {Enter}");
      const process = await screen.findByRole("button", {
        name: "結果を処理 · 1/2",
      });
      await waitFor(() => expect(process).toHaveFocus());
      await user.keyboard("{Enter}");
      await user.keyboard("{Enter}");
      expect(screen.queryByText("ターン精算完了")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "次のターン" })).toBeVisible();
    }
    await answerBoth();
    expect(requests[0].defeated).toEqual([]);
    expect(screen.getByLabelText("敵0のHP")).toHaveTextContent("HP 5/15");
    expect(screen.getByLabelText("敵1のHP")).toHaveTextContent("HP 5/15");
    await user.keyboard("{Enter}");
    await answerBoth(true);
    expect(requests[1].turn).toBe(1);
    expect(requests[1].answers).toEqual({ enemy0: ["a1"], enemy1: ["a0"] });
    expect(requests[1].defeated).toEqual(["enemy0", "enemy1"]);
    expect(requests[1]).not.toHaveProperty("hp");
  },
);
