import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import MultiBattle from "./MultiBattle";
import type { DungeonContent } from "./api";
import {
  type BattleTransport,
  type TurnInput,
  type TurnResult,
  defaultBalance,
} from "./battle";
import { type GameSave, enterDungeon, newSave } from "./domain";

vi.mock("~/features/quiz/QuizPreviewPrompt", () => ({
  default: () => <p>問題の詳細</p>,
}));
vi.mock("~/features/quiz/QuizReportButton", () => ({ default: () => null }));
vi.mock("./useBattleTempo", () => ({
  default: () => ({ tempo: "medium", saving: false, change: vi.fn() }),
}));

const content: DungeonContent = {
  knowledge: [],
  quizzes: [0, 1].map((index) => ({
    quiz_id: `q${index}`,
    quiz_type: "sent2term",
    statement: `説明${index}`,
    prompt: { subject: `問題${index}`, answer_kind: "term" },
    options: { [`a${index}`]: `選択肢${index}` },
    correct: [`a${index}`],
    no_correct_option: false,
    created: "2026-10-18T00:00:00Z",
  })),
};
const context = {
  balance: { ...defaultBalance, battle_tempo_medium_seconds: 0.1 },
  enemies: [
    {
      id: "e",
      name: "ゴースト",
      quizIndex: 0,
      hp: 100,
      attack: 10,
      mp: 12,
      special_attack: 25,
      special_defense: 7,
      speed: 10,
      relations: 0,
      region: 0,
    },
    {
      id: "not-here",
      name: "別の領域の敵",
      quizIndex: 1,
      hp: 100,
      attack: 10,
      relations: 0,
      region: 1,
    },
  ],
};
function initial(): GameSave {
  const save = enterDungeon(newSave(), "book", "本", 1);
  if (!save.run) throw new Error("Missing fixture run");
  return {
    ...save,
    content,
    run: {
      ...save.run,
      phase: "battle",
      answerDeadline: Date.now() + 45000,
      answerSeconds: 45,
    },
    battle: {
      id: "ctb",
      turn: 0,
      region: 0,
      checkpoint: "@entrance",
      enemies: ["e"],
      quizIndices: { e: 0 },
      endActionDone: true,
      schedule: {
        formula: "sqrt",
        actor_id: "player",
        quiz_enemy_id: "e",
        enemy_hp: { e: 100 },
        enemy_mp: { e: 4 },
        queue: [
          { actor_id: "player", distance: 0 },
          { actor_id: "e", distance: 3 },
          { actor_id: "player", distance: 6 },
        ],
      },
    },
  };
}

it("shows the backend forecast from left to right without selectable enemies", () => {
  render(
    <MemoryRouter>
      <MultiBattle
        save={initial()}
        content={content}
        context={context}
        playerName="あなた"
        onSaved={vi.fn()}
        onFinished={vi.fn()}
        onBusy={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    within(screen.getByRole("region", { name: "行動予測" }))
      .getAllByRole("listitem")
      .map((item) => item.getAttribute("aria-label")),
  ).toEqual(["1: あなた", "2: ゴースト", "3: あなた"]);
  expect(
    within(screen.getByRole("region", { name: "敵一覧" })).queryByRole(
      "button",
    ),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("別の領域の敵")).not.toBeInTheDocument();
  expect(screen.getByLabelText("ゴーストのMP")).toHaveTextContent("MP 4/12");
  expect(screen.getByText("特攻 25 · 特守 7")).toBeVisible();
});

it("keeps arrow navigation out of header settings while allowing Tab access", async () => {
  const user = userEvent.setup();
  const questions = {
    ...content,
    quizzes: [
      { ...content.quizzes[0], options: { a0: "選択肢0", b0: "別の選択肢" } },
    ],
  };
  render(
    <MemoryRouter>
      <MultiBattle
        save={initial()}
        content={questions}
        context={context}
        onSaved={vi.fn()}
        onFinished={vi.fn()}
        onBusy={vi.fn()}
      />
    </MemoryRouter>,
  );
  const first = screen.getByRole("button", { name: "選択肢0" });
  const second = screen.getByRole("button", { name: "別の選択肢" });
  const tempo = screen.getByRole("combobox", { name: "戦闘テンポ" });
  // Model real geometry: settings and Close are above the wide quiz choices.
  for (const element of screen
    .getByRole("dialog")
    .querySelectorAll("button, select")) {
    const top =
      element === first
        ? 200
        : element === second
          ? 270
          : element.closest(
                '[data-spatial-focus-ignore], [data-slot="dialog-close"]',
              )
            ? 0
            : 400;
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: top,
      left: 0,
      right: 300,
      top,
      bottom: top + 40,
      width: 300,
      height: 40,
      toJSON: () => ({}),
    });
  }
  await waitFor(() => expect(first).toHaveFocus());
  await user.keyboard("{ArrowUp}");
  expect(first).toHaveFocus();
  expect(tempo).toHaveValue("medium");
  await user.keyboard("{ArrowDown}");
  expect(second).toHaveFocus();
  await user.keyboard("{ArrowUp} ");
  expect(first).toHaveFocus();
  expect(first).toHaveAttribute("aria-pressed", "true");
  await user.tab({ shift: true });
  await user.tab({ shift: true });
  await user.tab({ shift: true });
  expect(tempo).toHaveFocus();
});

it("freezes the countdown on confirmation until the next action starts", async () => {
  vi.useFakeTimers();
  try {
    let release = () => {};
    const response = new Promise<void>((resolve) => {
      release = resolve;
    });
    function Fixture() {
      const [save, setSave] = useState(initial);
      const transport: BattleTransport = async <T,>(path: string) => {
        const copy = structuredClone(save);
        if (path === "battle/turn") {
          await response;
          copy.battleFeedback = "正解";
          return {
            state: { revision: 1, save: copy },
            results: { e: true },
            damage: 0,
            outgoing_damage: {},
          } satisfies TurnResult as T;
        }
        copy.battleFeedback = null;
        if (copy.run) copy.run.answerDeadline = Date.now() + 45000;
        return { revision: 2, save: copy } as T;
      };
      return (
        <MultiBattle
          save={save}
          content={content}
          context={context}
          simulation
          transport={transport}
          onSaved={(state) => setSave(state.save)}
          onFinished={vi.fn()}
          onBusy={vi.fn()}
        />
      );
    }
    render(
      <MemoryRouter>
        <Fixture />
      </MemoryRouter>,
    );
    const gauge = () => screen.getByRole("progressbar", { name: "残り時間" });
    act(() => vi.advanceTimersByTime(2000));
    expect(gauge()).toHaveAttribute("aria-valuenow", "43");
    fireEvent.click(screen.getByRole("button", { name: "回答を確定" }));
    act(() => vi.advanceTimersByTime(5000));
    expect(gauge()).toHaveAttribute("aria-valuenow", "43");
    await act(async () => release());
    act(() => vi.advanceTimersByTime(5000));
    expect(gauge()).toHaveAttribute("aria-valuenow", "43");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "次へ" })),
    );
    expect(gauge()).toHaveAttribute("aria-valuenow", "45");
    act(() => vi.advanceTimersByTime(1000));
    expect(gauge()).toHaveAttribute("aria-valuenow", "44");
  } finally {
    vi.useRealTimers();
  }
});

it("keeps keyboard focus across consecutive questions and sends no damage claims", async () => {
  const user = userEvent.setup();
  const requests: TurnInput[] = [];
  function Fixture() {
    const [save, setSave] = useState(initial);
    const transport: BattleTransport = async <T,>(
      path: string,
      payload?: unknown,
    ) => {
      const copy = structuredClone(save);
      if (!copy.battle?.schedule) throw new Error("Missing battle");
      if (path === "battle/turn") {
        const input = payload as TurnInput;
        requests.push(input);
        copy.battle.turn++;
        copy.battle.schedule.actor_id = null;
        copy.battle.schedule.enemy_hp.e -= 10;
        copy.battleFeedback = "正解";
        return {
          state: { revision: requests.length, save: copy },
          results: { e: true },
          damage: 0,
          outgoing_damage: { e: 10 },
        } as T;
      }
      copy.battleFeedback = null;
      copy.battle.schedule.actor_id = "e";
      copy.battle.quizIndices = { e: 1 };
      return { revision: 3, save: copy } as T;
    };
    return (
      <MultiBattle
        save={save}
        content={content}
        context={context}
        transport={transport}
        onSaved={(state) => setSave(state.save)}
        onFinished={vi.fn()}
        onBusy={vi.fn()}
      />
    );
  }
  render(
    <MemoryRouter>
      <Fixture />
    </MemoryRouter>,
  );
  const first = screen.getByRole("button", { name: "選択肢0" });
  await waitFor(() => expect(first).toHaveFocus());
  await user.keyboard(" {Enter}");
  const next = await screen.findByRole("button", { name: "次へ" });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  expect(requests).toHaveLength(1);
  expect(
    screen.queryByRole("button", { name: "選択肢1" }),
  ).not.toBeInTheDocument();
  await waitFor(() => expect(next).toHaveFocus());
  await user.keyboard("{Enter}");
  const second = await screen.findByRole("button", { name: "選択肢1" });
  await waitFor(() => expect(second).toHaveFocus());
  await user.keyboard(" {Enter}");
  await waitFor(() => expect(requests).toHaveLength(2));
  expect(requests.map((request) => request.answers)).toEqual([
    { e: ["a0"] },
    { e: ["a1"] },
  ]);
  expect(requests.every((request) => request.defeated.length === 0)).toBe(true);
});

it("settles timeout once and waits for Next even after the final action", async () => {
  const finished = vi.fn(async () => undefined);
  const requests = vi.fn();
  function Fixture() {
    const [save, setSave] = useState(() => {
      const value = initial();
      if (value.run) value.run.answerDeadline = Date.now() - 1;
      return value;
    });
    const transport: BattleTransport = async <T,>(
      _path: string,
      input?: unknown,
    ) => {
      requests(input);
      return {
        state: {
          revision: 2,
          save: {
            ...save,
            battle: null,
            battleFeedback: "敗北",
            run: { ...save.run, hp: 0, phase: "defeated" },
          },
        },
        results: {},
        damage: 35,
        outgoing_damage: {},
        enemy_hp: { e: 100 },
      } as T;
    };
    return (
      <MultiBattle
        save={save}
        content={content}
        context={{
          ...context,
          balance: { ...context.balance, battle_tempo_medium_seconds: 0.1 },
        }}
        transport={transport}
        onSaved={(state) => setSave(state.save)}
        onFinished={finished}
        onBusy={vi.fn()}
      />
    );
  }
  render(
    <MemoryRouter>
      <Fixture />
    </MemoryRouter>,
  );
  const next = await screen.findByRole("button", { name: "次へ" });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  expect(finished).not.toHaveBeenCalled();
  await userEvent.click(next);
  expect(finished).toHaveBeenCalledTimes(1);
  expect(requests).toHaveBeenCalledTimes(1);
  expect(requests.mock.calls[0][0].answers).toEqual({});
});
