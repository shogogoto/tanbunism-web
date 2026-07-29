import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import QuizSession from "./QuizSession";

const plan = {
  uid: "plan-1",
  name: "数学の復習",
  resource_ids: ["resource-1"],
  quiz_types: ["term2sent", "sent2term"],
  n_quiz: 1,
  n_option: 3,
  created: "2026-07-28T00:00:00Z",
};

const recommendation = {
  resource_id: "resource-1",
  quiz_type: "term2sent",
  reason: "coverage",
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
const secondRecommendation = {
  resource_id: "resource-1",
  quiz_type: "sent2term",
  reason: "low_accuracy",
  quiz: {
    quiz_id: "quiz-2",
    statement: "「単位元」に合う説明を選んでください",
    options: {
      option_c: "演算しても相手を変化させない元",
      option_d: "演算の順序を交換できる性質",
    },
    correct: ["option_c"],
    created: "2026-07-28T00:00:00Z",
    no_correct_option: false,
  },
} as const;
const answeredQuizIds: string[] = [];

const server = setupServer(
  http.get("*/quiz/study-plans", () => HttpResponse.json([plan])),
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
  http.post("*/quiz/study-plans/plan-1/recommendations", ({ request }) =>
    HttpResponse.json(
      new URL(request.url).searchParams.get("quiz_type") === "term2sent"
        ? [recommendation]
        : [],
    ),
  ),
  http.put("*/quiz/study-plans/plan-1", async ({ request }) =>
    HttpResponse.json({
      ...((await request.json()) as typeof plan),
      uid: plan.uid,
      created: plan.created,
    }),
  ),
  http.delete(
    "*/quiz/study-plans/plan-1",
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.post("*/quiz/answer/:quizId", async ({ params, request }) => {
    const body = (await request.json()) as { selected: string[] };
    const quizId = String(params.quizId);
    const currentQuiz =
      quizId === secondRecommendation.quiz.quiz_id
        ? secondRecommendation.quiz
        : recommendation.quiz;
    answeredQuizIds.push(quizId);
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
          quiz_id: quizId,
          quiz_type: "term2sent",
          readable: currentQuiz,
        },
      ],
      links: [
        {
          quiz_id: quizId,
          sentence_id: "sentence-1",
          role: "correct",
        },
      ],
      answers: [
        {
          answer_uid: "answer-1",
          quiz_uid: quizId,
          selected: body.selected,
          who: "user-1",
          is_correct: currentQuiz.correct.every((id) =>
            body.selected.includes(id),
          ),
          created: "2026-07-28T00:00:00Z",
        },
      ],
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  answeredQuizIds.length = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

function renderQuizSession() {
  return render(
    <MemoryRouter>
      <QuizSession />
    </MemoryRouter>,
  );
}

describe("QuizSession", () => {
  it("QuizTypeごとに届いた問題から表示する", async () => {
    let finishSecondType!: () => void;
    const waitForSecondType = new Promise<void>((resolve) => {
      finishSecondType = resolve;
    });
    server.use(
      http.post(
        "*/quiz/study-plans/plan-1/recommendations",
        async ({ request }) => {
          const quizType = new URL(request.url).searchParams.get("quiz_type");
          if (quizType === "sent2term") {
            await waitForSecondType;
            return HttpResponse.json([]);
          }
          return HttpResponse.json([recommendation]);
        },
      ),
    );

    renderQuizSession();

    expect(
      await screen.findByText(recommendation.quiz.statement),
    ).toBeVisible();
    expect(
      screen.getByText("既存の単文から用語を確認しています…"),
    ).toBeVisible();
    expect(screen.getByText("1 / 2")).toBeVisible();

    finishSecondType();
    await waitFor(() => {
      expect(
        screen.queryByText("既存の単文から用語を確認しています…"),
      ).not.toBeInTheDocument();
    });
  });

  it("StudyPlanの推薦クイズに回答して正誤を表示する", async () => {
    const user = userEvent.setup();
    renderQuizSession();

    expect(
      await screen.findByText("「可換」とはどのような性質ですか？"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("StudyPlan")).toHaveValue("plan-1");
    expect(screen.getByText("Coverageを広げる")).toBeInTheDocument();
    expect(screen.getByText("TERM2SENT")).toBeInTheDocument();

    await user.keyboard("1");
    expect(
      screen.getByRole("button", { name: /1.*演算の順序を交換できる/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Enter}");

    expect(await screen.findByText("正解です")).toBeInTheDocument();
    expect(
      screen.getAllByText("正解", { selector: "[data-slot=badge]" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("1問中 1問正解しました。")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "新しい推薦を取得" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Resourceへ戻る" }),
    ).toHaveAttribute("href", "/resource/resource-1");
    expect(screen.getByText("このクイズの知識")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /可換: 可換とは、演算の順序を交換しても結果が変わらない/,
      }),
    ).toHaveAttribute("href", "/resource/resource-1#sentence-1");
  });

  it("推薦された全Quizを列挙して一括回答する", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/quiz/study-plans/plan-1/recommendations", () =>
        HttpResponse.json([recommendation, secondRecommendation]),
      ),
    );
    renderQuizSession();

    expect(
      await screen.findByText(recommendation.quiz.statement),
    ).toBeVisible();
    expect(screen.getByText(secondRecommendation.quiz.statement)).toBeVisible();
    expect(screen.getByText("未回答 2問")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "1. 演算の順序を交換できる",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "1. 演算しても相手を変化させない元",
      }),
    );
    expect(screen.getByText("2問すべて回答済み")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "まとめて回答" }));

    expect(await screen.findByText("2問中 2問正解しました。")).toBeVisible();
    expect(answeredQuizIds).toEqual(["quiz-1", "quiz-2"]);
    expect(screen.getAllByText("このクイズの知識")).toHaveLength(2);
  });

  it("一括回答の再実行では送信に失敗したQuizだけを送る", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/quiz/study-plans/plan-1/recommendations", () =>
        HttpResponse.json([recommendation, secondRecommendation]),
      ),
      http.post(
        "*/quiz/answer/quiz-2",
        () => HttpResponse.json({}, { status: 503 }),
        { once: true },
      ),
    );
    renderQuizSession();

    await screen.findByText(secondRecommendation.quiz.statement);
    await user.click(
      screen.getByRole("button", {
        name: "1. 演算の順序を交換できる",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "1. 演算しても相手を変化させない元",
      }),
    );
    await user.click(screen.getByRole("button", { name: "まとめて回答" }));

    expect(
      await screen.findByText(/1問の回答を送信できませんでした/),
    ).toBeVisible();
    expect(answeredQuizIds).toEqual(["quiz-1"]);
    await user.click(screen.getByRole("button", { name: "まとめて回答" }));

    expect(await screen.findByText("2問中 2問正解しました。")).toBeVisible();
    expect(answeredQuizIds).toEqual(["quiz-1", "quiz-2"]);
  });

  it("StudyPlanがなければ作成してクイズを開始できる", async () => {
    const user = userEvent.setup();
    let createdPlan: typeof plan | undefined;
    const resourceId = "11111111-1111-1111-1111-111111111111";
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
                  uid: resourceId,
                  name: "数学ノート",
                  authors: [],
                },
              },
            ],
          },
          roots_: {},
          user_id: "user-1",
          stats: { "11111111111111111111111111111111": { n_sentence: 10 } },
        }),
      ),
      http.post("*/quiz/study-plans", async ({ request }) => {
        const draft = (await request.json()) as typeof plan;
        createdPlan = draft;
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
    for (const quizType of [
      "単文から用語",
      "関係から単文の組",
      "単文の組から関係",
    ]) {
      await user.click(screen.getByRole("checkbox", { name: quizType }));
    }
    await user.clear(screen.getByLabelText("出題数（合計）"));
    await user.type(screen.getByLabelText("出題数（合計）"), "1");
    await user.click(
      screen.getByRole("button", { name: "作成してクイズを始める" }),
    );

    expect(
      await screen.findByText("「可換」とはどのような性質ですか？"),
    ).toBeInTheDocument();
    expect(createdPlan?.resource_ids).toEqual([resourceId]);
    expect(createdPlan?.quiz_types).toEqual([
      "term2sent",
      "sent2term",
      "rel2pair",
      "pair2rel",
    ]);
    expect(createdPlan?.n_quiz).toBe(4);
  });

  it("StudyPlanを編集・削除できる", async () => {
    const user = userEvent.setup();
    renderQuizSession();

    expect(
      await screen.findByText(recommendation.quiz.statement),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "編集" }));

    const name = screen.getByLabelText("Plan名");
    await user.clear(name);
    await user.type(name, "数学を重点復習");
    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    expect(
      await screen.findByRole("option", { name: "数学を重点復習" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(await screen.findByText("学習計画を作る")).toBeInTheDocument();
  });

  it("推薦できない理由をAPIから表示する", async () => {
    server.use(
      http.post("*/quiz/study-plans/plan-1/recommendations", () =>
        HttpResponse.json(
          {
            detail: {
              code: 400,
              message: "誤答肢が不足しています",
            },
          },
          { status: 400 },
        ),
      ),
    );

    renderQuizSession();

    expect(
      await screen.findByText("誤答肢が不足しています"),
    ).toBeInTheDocument();
  });
});
