import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import SpecialtySkill from "./SpecialtySkill";
import { gameRequest } from "./battle";
import { type GameSave, enterDungeon, newSave } from "./domain";
import type { GameState } from "./state";

vi.mock("./battle", async (original) => ({
  ...(await original<typeof import("./battle")>()),
  gameRequest: vi.fn(),
}));
vi.mock("~/features/quiz/QuizReportButton", () => ({ default: () => null }));
const result = vi.fn();
let duration = 45000;
const quiz = {
  quiz_id: "quiz",
  quiz_type: "sent2term" as const,
  prompt: { subject: "知識の力", answer_kind: "term" as const },
  statement: "知識の力",
  options: { a: "正解の用語", b: "別の用語" },
  correct: ["a"],
  created: "2026-10-14T00:00:00Z",
  no_correct_option: false,
};
function initial(): GameSave {
  const save = enterDungeon(newSave(), "book", "本", 1);
  if (save.run)
    save.run = {
      ...save.run,
      phase: "battle",
      mp: 10,
      maxMp: 10,
      answerSeconds: 45,
    };
  return {
    ...save,
    bossClears: { book: [5] },
    battleFeedback: "結果処理済み",
    battle: {
      id: "battle",
      turn: 1,
      region: 0,
      checkpoint: "@entrance",
      enemies: ["enemy"],
    },
  };
}
function show() {
  function Wrapper() {
    const [save, setSave] = useState(initial);
    return (
      <SpecialtySkill
        save={save}
        cost={3}
        enemyHp={{ enemy: 10 }}
        clockOffset={0}
        disabled={false}
        onBusy={vi.fn()}
        onSaved={(state) => setSave(state.save)}
        onResult={result}
      />
    );
  }
  render(
    <MemoryRouter>
      <Wrapper />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  duration = 45000;
  vi.mocked(gameRequest).mockImplementation(async (path) => {
    const save = initial();
    const skill = {
      id: "skill",
      resourceId: "book",
      name: "本の専門分野",
      quizId: "quiz",
      attack: 20,
      deadline: Date.now() + duration,
    };
    if (save.run) save.run.mp = 7;
    if (save.battle) save.battle = { ...save.battle, skillUsed: true, skill };
    if (path === "battle/skill/start")
      return { state: { revision: 2, save } as GameState, skill, quiz };
    return {
      state: { revision: 3, save },
      correct: true,
      outgoing_damage: { enemy: 5 },
      damage: 0,
    };
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([0, 0.999])(
  "opens a shuffled real quiz and confirms with Space and Enter without a second MP request (random=%s)",
  async (random) => {
    vi.spyOn(Math, "random").mockReturnValue(random);
    show();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "専門分野 · MP 3" }));
    const option = await screen.findByRole("button", { name: "正解の用語" });
    const options = screen
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("data-quiz-option-index"));
    await waitFor(() => expect(options[0]).toHaveFocus());
    if (option !== options[0]) await user.keyboard("{ArrowDown}");
    expect(option).toHaveFocus();
    await user.keyboard(" {Enter}");
    await waitFor(() => expect(result).toHaveBeenCalled());
    expect(gameRequest).toHaveBeenCalledWith("battle/skill/answer", {
      skill_id: "skill",
      selected: ["a"],
      enemy_hp: { enemy: 10 },
    });
    expect(
      vi
        .mocked(gameRequest)
        .mock.calls.filter(([path]) => path === "battle/skill/start"),
    ).toHaveLength(1);
  },
);

it("settles a timed-out specialty as unanswered even after its dialog is closed", async () => {
  duration = 1500;
  show();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "専門分野 · MP 3" }));
  await user.keyboard("{Escape}");
  await waitFor(
    () =>
      expect(gameRequest).toHaveBeenCalledWith("battle/skill/answer", {
        skill_id: "skill",
        selected: null,
        enemy_hp: { enemy: 10 },
      }),
    { timeout: 3000 },
  );
});
