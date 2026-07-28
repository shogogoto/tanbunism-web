import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import QuizSession from "./QuizSession";

const plan = {
  uid: "plan-algebra",
  name: "代数学の復習",
  resource_ids: ["resource-algebra"],
  quiz_type: "term2sent",
  n_quiz: 2,
  n_option: 3,
  created: "2026-07-28T00:00:00Z",
};

const recommendations = [
  {
    resource_id: "resource-algebra",
    quiz: {
      quiz_id: "quiz-commutative",
      statement: "「可換」とはどのような性質ですか？",
      options: {
        option_a: "演算の順序を交換しても結果が変わらない",
        option_b: "すべての元に逆元が存在する",
        option_c: "演算を繰り返すと必ず単位元になる",
      },
      correct: ["option_a"],
      created: "2026-07-28T00:00:00Z",
      no_correct_option: false,
    },
  },
  {
    resource_id: "resource-algebra",
    quiz: {
      quiz_id: "quiz-identity",
      statement: "単位元の説明として正しいものを選んでください。",
      options: {
        option_a: "演算しても相手を変化させない元",
        option_b: "自分自身と演算すると消える元",
        option_c: "集合に必ず二つ存在する元",
      },
      correct: ["option_a"],
      created: "2026-07-28T00:00:00Z",
      no_correct_option: false,
    },
  },
];

const meta = {
  title: "Features/Quiz/QuizSession",
  component: QuizSession,
  parameters: {
    msw: {
      handlers: [
        http.get("*/quiz/study-plans", () => HttpResponse.json([plan])),
        http.post("*/quiz/study-plans/:planId/recommendations", () =>
          HttpResponse.json(recommendations),
        ),
        http.post("*/quiz/answer/:quizId", async ({ params, request }) => {
          const body = (await request.json()) as { selected: string[] };
          const quiz = recommendations.find(
            ({ quiz }) => quiz.quiz_id === params.quizId,
          );
          const isCorrect =
            quiz?.quiz.correct.length === body.selected.length &&
            quiz.quiz.correct.every((id) => body.selected.includes(id));

          return HttpResponse.json({
            sentences: [],
            quizzes: [],
            links: [],
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
        }),
      ],
    },
  },
} satisfies Meta<typeof QuizSession>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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
      ],
    },
  },
};
