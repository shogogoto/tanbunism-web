import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import MultiBattle from "./MultiBattle";
import type { DungeonContent } from "./api";
import { type TurnInput, defaultBalance } from "./battle";
import { type GameSave, enterDungeon, newSave } from "./domain";

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
});
afterEach(() => server.resetHandlers());
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
  relations: 0,
  region: 2,
}));
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
function Fixture({ deadline }: { deadline?: number }) {
  const [save, setSave] = useState(() => initial(deadline));
  return (
    <MemoryRouter>
      <MultiBattle
        save={save}
        content={content}
        context={{ balance: defaultBalance, enemies }}
        onSaved={(state) => setSave(state.save)}
        onFinished={async () => undefined}
        onBusy={() => undefined}
      />
    </MemoryRouter>
  );
}
it("confirms locally without revealing correctness, locks answers, and sends once at turn end", async () => {
  const user = userEvent.setup();
  render(<Fixture />);
  await user.click(screen.getByRole("button", { name: "選択肢一" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  expect(requests).toHaveLength(0);
  expect(screen.queryByText("正解です")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "敵0" }));
  expect(screen.getByText("回答確定")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "選択肢一" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "敵1" }));
  await user.click(screen.getByRole("button", { name: "選択肢二" }));
  await user.click(screen.getByRole("button", { name: "回答を確定" }));
  await screen.findByText("ターン精算完了");
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
it("seals the timed-out turn and retries the same payload", async () => {
  failures = 1;
  render(<Fixture deadline={Date.now() + 30} />);
  await screen.findByText("通信失敗");
  expect(requests).toHaveLength(1);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "精算を再試行" }));
  await screen.findByText("ターン精算完了");
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(requests[0].answers).toEqual({});
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

it("keeps damaged enemy HP across turns without sending it to the server", async () => {
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
      if (save.battle) save.battle.turn = 1;
      return HttpResponse.json({ revision: 3, save });
    }),
  );
  function TwoTurnFixture() {
    const [save, setSave] = useState(initial);
    return (
      <MemoryRouter>
        <MultiBattle
          save={save}
          content={content}
          context={{
            balance: defaultBalance,
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
  async function answerBoth() {
    await user.click(screen.getByRole("button", { name: "選択肢一" }));
    await user.click(screen.getByRole("button", { name: "回答を確定" }));
    await user.click(screen.getByRole("button", { name: "選択肢二" }));
    await user.click(screen.getByRole("button", { name: "回答を確定" }));
    await screen.findByText("ターン精算完了");
  }
  await answerBoth();
  expect(requests[0].defeated).toEqual([]);
  expect(screen.getByText(/HP 5\/15/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "次のターン" }));
  await answerBoth();
  expect(requests[1].turn).toBe(1);
  expect(requests[1].defeated).toEqual(["enemy0", "enemy1"]);
  expect(requests[1]).not.toHaveProperty("hp");
});
