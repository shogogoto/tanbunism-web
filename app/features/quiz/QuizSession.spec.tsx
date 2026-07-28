import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import QuizSession from "./QuizSession";

const plan = {
  uid: "plan-1",
  name: "数学の復習",
  resource_ids: ["resource-1"],
  quiz_type: "term2sent",
  n_quiz: 1,
  n_option: 3,
  created: "2026-07-28T00:00:00Z",
};

const recommendation = {
  resource_id: "resource-1",
  quiz: {
    quiz_id: "quiz-1",
    statement: "「可換」とはどのような性質ですか？",
    options: {
      option_a: "演算の順序を交換できる",
      option_b: "必ず逆元が存在する",
    },
    correct: ["option_a"],
    created: "2026-07-28T00:00:00Z",
    no_correct_option: false,
  },
};

const server = setupServer(
  http.get("*/quiz/study-plans", () => HttpResponse.json([plan])),
  http.post("*/quiz/study-plans/plan-1/recommendations", () =>
    HttpResponse.json([recommendation]),
  ),
  http.post("*/quiz/answer/quiz-1", async ({ request }) => {
    const body = (await request.json()) as { selected: string[] };
    return HttpResponse.json({
      sentences: [],
      quizzes: [],
      links: [],
      answers: [
        {
          answer_uid: "answer-1",
          quiz_uid: "quiz-1",
          selected: body.selected,
          who: "user-1",
          is_correct: body.selected.includes("option_a"),
          created: "2026-07-28T00:00:00Z",
        },
      ],
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("QuizSession", () => {
  it("StudyPlanの推薦クイズに回答して正誤を表示する", async () => {
    const user = userEvent.setup();
    render(<QuizSession />);

    expect(
      await screen.findByText("「可換」とはどのような性質ですか？"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("StudyPlan")).toHaveValue("plan-1");

    await user.click(
      screen.getByRole("button", { name: "演算の順序を交換できる" }),
    );
    await user.click(screen.getByRole("button", { name: "回答する" }));

    expect(await screen.findByText("正解です")).toBeInTheDocument();
  });

  it("StudyPlanがなければ作成を促す", async () => {
    server.use(http.get("*/quiz/study-plans", () => HttpResponse.json([])));

    render(<QuizSession />);

    expect(await screen.findByText("学習計画がありません")).toBeInTheDocument();
    expect(screen.getByText(/StudyPlanを作成/)).toBeInTheDocument();
  });
});
