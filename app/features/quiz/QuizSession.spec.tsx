import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
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
      sentences: [
        {
          uid: "sentence-1",
          sentence:
            "可換とは、演算の順序を交換しても結果が変わらない性質である。",
          term: { names: ["可換"] },
          stats: {
            n_detail: 0,
            n_premise: 0,
            n_conclusion: 0,
            n_refer: 0,
            n_referred: 0,
          },
          resource_uid: "resource-1",
        },
      ],
      quizzes: [
        {
          quiz_id: "quiz-1",
          quiz_type: "term2sent",
          readable: recommendation.quiz,
        },
      ],
      links: [
        {
          quiz_id: "quiz-1",
          sentence_id: "sentence-1",
          role: "correct",
        },
      ],
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

function renderQuizSession() {
  return render(
    <MemoryRouter>
      <QuizSession />
    </MemoryRouter>,
  );
}

describe("QuizSession", () => {
  it("StudyPlanの推薦クイズに回答して正誤を表示する", async () => {
    const user = userEvent.setup();
    renderQuizSession();

    expect(
      await screen.findByText("「可換」とはどのような性質ですか？"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("StudyPlan")).toHaveValue("plan-1");

    await user.click(
      screen.getByRole("button", { name: "演算の順序を交換できる" }),
    );
    await user.click(screen.getByRole("button", { name: "回答する" }));

    expect(await screen.findByText("正解です")).toBeInTheDocument();
    expect(screen.getByText("このクイズの知識")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /可換: 可換とは、演算の順序を交換しても結果が変わらない/,
      }),
    ).toHaveAttribute("href", "/knowde/sentence-1");
  });

  it("StudyPlanがなければ作成してクイズを開始できる", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/quiz/study-plans", () => HttpResponse.json([])),
      http.get("*/namespace", () =>
        HttpResponse.json({
          g: {
            directed: true,
            edges: [],
            graph: {},
            multigraph: false,
            nodes: [
              {
                id: {
                  uid: "resource-1",
                  name: "数学ノート",
                  authors: [],
                },
              },
            ],
          },
          roots_: {},
          user_id: "user-1",
          stats: { "resource-1": { n_sentence: 10 } },
        }),
      ),
      http.post("*/quiz/study-plans", async ({ request }) => {
        const draft = (await request.json()) as typeof plan;
        return HttpResponse.json(
          { ...draft, uid: "plan-new", created: plan.created },
          { status: 201 },
        );
      }),
      http.post("*/quiz/study-plans/plan-new/recommendations", () =>
        HttpResponse.json([recommendation]),
      ),
    );

    renderQuizSession();

    expect(await screen.findByText("学習計画を作る")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Plan名"), "数学の復習");
    await user.click(screen.getByRole("checkbox", { name: "数学ノート" }));
    await user.click(
      screen.getByRole("button", { name: "作成してクイズを始める" }),
    );

    expect(
      await screen.findByText("「可換」とはどのような性質ですか？"),
    ).toBeInTheDocument();
  });
});
