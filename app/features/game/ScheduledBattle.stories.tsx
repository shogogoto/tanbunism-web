import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import MultiBattle from "./MultiBattle";
import type { DungeonContent } from "./api";
import { type BattleTransport, type TurnInput, defaultBalance } from "./battle";
import { type GameSave, enterDungeon, newSave } from "./domain";

const content: DungeonContent = {
  knowledge: [],
  quizzes: [
    {
      quiz_id: "preview-question",
      quiz_type: "sent2term",
      statement: "復習を楽しく、継続しやすくする仕組み",
      prompt: { subject: "学習の仕組み", answer_kind: "term" },
      options: { yes: "ゲーミフィケーション", no: "無関係な選択肢" },
      correct: ["yes"],
      no_correct_option: false,
      created: "2026-10-18T00:00:00Z",
    },
  ],
};
const enemies = [
  {
    id: "ghost",
    name: "ゴースト",
    icon: "ghost",
    quizIndex: 0,
    hp: 100,
    attack: 10,
    relations: 0,
    region: 0,
  },
  {
    id: "skull",
    name: "スケルトン",
    icon: "skull",
    quizIndex: 0,
    hp: 100,
    attack: 10,
    relations: 0,
    region: 0,
  },
];
const order = [
  "player",
  "ghost",
  "player",
  "skull",
  "player",
  "ghost",
  "skull",
  "player",
  "ghost",
  "player",
];

function initial(): GameSave {
  const save = enterDungeon(newSave(), "preview", "行動順プレビュー", 1);
  if (!save.run) throw new Error("Missing run");
  return {
    ...save,
    content,
    run: {
      ...save.run,
      phase: "battle",
      answerSeconds: 300,
      answerDeadline: Date.now() + 300000,
    },
    battle: {
      id: "preview-battle",
      turn: 0,
      region: 0,
      checkpoint: "@entrance",
      enemies: ["ghost", "skull"],
      quizIndices: { ghost: 0 },
      endActionDone: true,
      schedule: {
        formula: "sqrt",
        actor_id: "player",
        quiz_enemy_id: "ghost",
        enemy_hp: { ghost: 100, skull: 100 },
        queue: order.map((actor_id, index) => ({ actor_id, distance: index })),
      },
    },
  };
}

function Preview() {
  const [save, setSave] = useState(initial);
  // Fixed backend replies for isolated UI verification; no live requests/writes.
  const transport: BattleTransport = async <T,>(
    path: string,
    body?: unknown,
  ) => {
    const copy = structuredClone(save);
    const marker = copy.battle;
    if (!marker?.schedule || !copy.run)
      throw new Error("Missing preview battle");
    if (path === "battle/turn") {
      const input = body as TurnInput;
      const target = marker.schedule.quiz_enemy_id ?? "ghost";
      const correct = input.answers[target]?.includes("yes") ?? false;
      marker.turn++;
      marker.schedule.actor_id = null;
      if (correct)
        marker.schedule.enemy_hp[target] = Math.max(
          0,
          marker.schedule.enemy_hp[target] - 10,
        );
      else copy.run.hp = Math.max(0, copy.run.hp - 3);
      copy.battleFeedback = correct ? "正解" : "不正解";
      return {
        state: { revision: marker.turn, save: copy },
        results: { [target]: correct },
        damage: correct ? 0 : 3,
        outgoing_damage: correct ? { [target]: 10 } : {},
      } as T;
    }
    const offset = marker.turn % order.length;
    marker.schedule.queue = [
      ...order.slice(offset),
      ...order.slice(0, offset),
    ].map((actor_id, index) => ({ actor_id, distance: index }));
    marker.schedule.actor_id = order[offset];
    marker.schedule.quiz_enemy_id =
      order[offset] === "player" ? "ghost" : order[offset];
    marker.quizIndices = { [marker.schedule.quiz_enemy_id]: 0 };
    copy.battleFeedback = null;
    copy.run.answerDeadline = Date.now() + 300000;
    return { revision: marker.turn, save: copy } as T;
  };
  return (
    <MultiBattle
      save={save}
      content={content}
      context={{ balance: defaultBalance, enemies }}
      playerName="プレイヤー"
      transport={transport}
      onSaved={(state) => setSave(state.save)}
      onFinished={async () => undefined}
      onBusy={() => undefined}
    />
  );
}
const meta = {
  title: "Game/Scheduled Battle",
  component: Preview,
} satisfies Meta<typeof Preview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ActionForecast: Story = {};
