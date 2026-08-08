import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { expect, userEvent, within } from "storybook/test";
import QuizSession from "./QuizSession";

const plan = {
  uid: "plan-algebra",
  name: "代数学の復習",
  resource_ids: ["resource-algebra"],
  quiz_types: ["term2sent", "sent2term"],
  n_quiz: 2,
  n_option: 3,
  created: "2026-07-28T00:00:00Z",
};

const recommendations = [
  {
    resource_id: "resource-algebra",
    reason: "unattempted",
    quiz: {
      quiz_id: "quiz-commutative",
      statement: "「可換」とはどのような性質ですか？",
      options: {
        "sentence-commutative": "演算の順序を交換しても結果が変わらない",
        "sentence-identity": "すべての元に逆元が存在する",
        option_c: "演算を繰り返すと必ず単位元になる",
      },
      correct: ["sentence-commutative"],
      created: "2026-07-28T00:00:00Z",
      no_correct_option: false,
    },
  },
  {
    resource_id: "resource-algebra",
    reason: "low_accuracy",
    quiz: {
      quiz_id: "quiz-identity",
      statement: "単位元の説明として正しいものを選んでください。",
      options: {
        "sentence-identity": "演算しても相手を変化させない元",
        "sentence-commutative": "自分自身と演算すると消える元",
        option_c: "集合に必ず二つ存在する元",
      },
      correct: ["sentence-identity"],
      created: "2026-07-28T00:00:00Z",
      no_correct_option: false,
    },
  },
];

const answerHandler = http.post(
  "*/quiz/answer/:quizId",
  async ({ params, request }) => {
    const body = (await request.json()) as { selected: string[] };
    const quiz = recommendations.find(
      ({ quiz }) => quiz.quiz_id === params.quizId,
    );
    const isCorrect =
      quiz?.quiz.correct.length === body.selected.length &&
      quiz.quiz.correct.every((id) => body.selected.includes(id));

    return HttpResponse.json({
      sentences: [
        {
          uid: "sentence-commutative",
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
          resource_uid: "resource-algebra",
        },
        {
          uid: "sentence-identity",
          sentence: "単位元とは、演算しても相手を変化させない元である。",
          term: { names: ["単位元"] },
          stats: {
            n_detail: 0,
            n_premise: 0,
            n_conclusion: 0,
            n_refer: 0,
            n_referred: 0,
          },
          resource_uid: "resource-algebra",
        },
      ],
      quizzes: quiz
        ? [
            {
              quiz_id: quiz.quiz.quiz_id,
              quiz_type: "term2sent",
              readable: quiz.quiz,
            },
          ]
        : [],
      links:
        params.quizId === "quiz-commutative"
          ? [
              {
                quiz_id: params.quizId,
                sentence_id: "sentence-commutative",
                role: "correct",
              },
              {
                quiz_id: params.quizId,
                sentence_id: "sentence-identity",
                role: "option",
              },
            ]
          : [
              {
                quiz_id: params.quizId,
                sentence_id: "sentence-identity",
                role: "correct",
              },
              {
                quiz_id: params.quizId,
                sentence_id: "sentence-commutative",
                role: "option",
              },
            ],
      answers: [
        {
          answer_uid: "answer-preview",
          quiz_uid: params.quizId,
          selected: body.selected,
          who: "user-preview",
          is_correct: isCorrect,
          created: "2026-07-28T00:00:00Z",
        },
      ],
    });
  },
);

const meta = {
  title: "Features/Quiz/QuizSession",
  component: QuizSession,
  parameters: {
    msw: {
      handlers: [
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
                    uid: "resource-algebra",
                    name: "代数学の読書メモ",
                    authors: [],
                  },
                },
              ],
            },
            roots_: {},
            user_id: "user-preview",
            stats: { "resource-algebra": { n_sentence: 24 } },
          }),
        ),
        http.put("*/quiz/study-plans/:planId", async ({ request }) =>
          HttpResponse.json({
            ...((await request.json()) as typeof plan),
            uid: plan.uid,
            created: plan.created,
          }),
        ),
        http.delete(
          "*/quiz/study-plans/:planId",
          () => new HttpResponse(null, { status: 204 }),
        ),
        http.post("*/quiz/study-plans/:planId/recommendations", () =>
          HttpResponse.json(recommendations),
        ),
        answerHandler,
      ],
    },
  },
} satisfies Meta<typeof QuizSession>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AnsweredWithQuizChain: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole("button", {
        name: "1. 演算の順序を交換しても結果が変わらない",
      }),
    );
    await userEvent.click(
      canvas.getByRole("button", {
        name: "1. 演算しても相手を変化させない元",
      }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "まとめて回答" }));

    await expect(
      canvas.findByRole("heading", { name: "今回の学習結果" }),
    ).resolves.toBeInTheDocument();
    await expect(
      canvas.findByText("2問中 2問正解しました。"),
    ).resolves.toBeInTheDocument();
    await expect(
      canvas.findAllByTitle(/可換とは|単位元とは/),
    ).resolves.toHaveLength(4);
  },
};

export const CompletedSession: Story = { ...AnsweredWithQuizChain };

export const NoStudyPlan: Story = {
  parameters: {
    msw: {
      handlers: [
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
                    uid: "resource-algebra",
                    name: "代数学の読書メモ",
                    authors: [],
                  },
                },
                {
                  id: {
                    uid: "resource-logic",
                    name: "論理学の読書メモ",
                    authors: [],
                  },
                },
              ],
            },
            roots_: {},
            user_id: "user-preview",
            stats: {
              "resource-algebra": { n_sentence: 24 },
              "resource-logic": { n_sentence: 18 },
            },
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
          HttpResponse.json(recommendations),
        ),
        answerHandler,
      ],
    },
  },
};
