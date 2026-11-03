import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import BattleDialog from "./BattleDialog";
import EndTurnAction from "./EndTurnAction";
import type { BattleTransport } from "./battle";
import { enterDungeon, newSave } from "./domain";
import type { GameState } from "./state";

it("automatically starts once, answers two resource quizzes with keyboard, and never calls normal turn APIs", async () => {
  const initial = enterDungeon(newSave(), "book", "本", 1);
  if (!initial.run) throw new Error("Missing run");
  let state: GameState = {
    revision: 1,
    save: {
      ...initial,
      run: { ...initial.run, phase: "battle" },
      gambits: [
        {
          enabled: true,
          condition: "always",
          threshold: 30,
          action: "specialty",
          definition_id: "specialty_test",
        },
      ],
      battle: {
        id: "battle",
        turn: 1,
        region: 0,
        checkpoint: "@entrance",
        enemies: ["enemy"],
      },
    },
  };
  const calls = vi.fn();
  const action = {
    id: "action",
    name: "専門分野",
    index: 0,
    quiz_ids: ["q1", "q2"],
    deadline: Date.now() + 30000,
  };
  const quiz = {
    quiz_id: "q1",
    quiz_type: "sent2term",
    statement: "説明を選ぶ",
    options: { yes: "正しい答え", no: "違う答え" },
    correct: ["yes"],
    no_correct_option: false,
    created: "2026-10-16",
  };
  let index = 0;
  const transport: BattleTransport = async <T,>(
    path: string,
    body?: unknown,
  ): Promise<T> => {
    calls(path, body);
    if (path === "battle/gambit/answer") index++;
    const current = index < 2 ? { ...action, index } : null;
    if (!state.save.battle) throw new Error("Missing battle");
    state = {
      revision: state.revision + 1,
      save: {
        ...state.save,
        battle: {
          ...state.save.battle,
          endActionDone: true,
          endAction: current,
        },
      },
    };
    return {
      state,
      action: current,
      quiz: current ? { ...quiz, quiz_id: `q${index + 1}` } : null,
      outgoing_damage: {},
    } as T;
  };
  function Harness() {
    const [save, setSave] = useState(state.save);
    if (!save.run) throw new Error("Missing run");
    return (
      <BattleDialog run={save.run} busy={false}>
        <EndTurnAction
          save={save}
          enemyHp={{ enemy: 100 }}
          transport={transport}
          clockOffset={0}
          onSaved={(next) => setSave(next.save)}
          onDamage={() => undefined}
          onBusy={() => undefined}
        />
        <button
          type="button"
          data-battle-advance
          disabled={
            !save.battle?.endActionDone || Boolean(save.battle.endAction)
          }
        >
          次のターン
        </button>
      </BattleDialog>
    );
  }
  render(
    <MemoryRouter>
      <Harness />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  await screen.findByText(/1\/2問/);
  for (let i = 0; i < 2; i++) {
    const options = screen.getAllByRole("button", {
      name: /正しい答え|違う答え/,
    });
    const correct = screen.getByRole("button", { name: /正しい答え/ });
    await waitFor(() => expect(options[0]).toHaveFocus());
    if (document.activeElement !== correct) await user.keyboard("{ArrowDown}");
    expect(correct).toHaveFocus();
    await user.keyboard(" {Enter}");
    if (i === 0) await screen.findByText(/2\/2問/);
  }
  await waitFor(() => expect(calls).toHaveBeenCalledTimes(3));
  expect(calls.mock.calls.map(([path]) => path)).toEqual([
    "battle/gambit/start",
    "battle/gambit/answer",
    "battle/gambit/answer",
  ]);
  expect(calls.mock.calls[2][1]).toMatchObject({ index: 1, selected: ["yes"] });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "次のターン" })).toHaveFocus(),
  );
});
