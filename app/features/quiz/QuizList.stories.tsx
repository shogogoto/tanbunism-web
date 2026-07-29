import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import QuizList from "./QuizList";

const quizzes = [
  {
    quiz_id: "quiz-commutative",
    statement: "「可換」に合う文を当ててください",
    options: {
      "sentence-commutative":
        "演算の順序を交換しても結果が変わらない性質である。",
      "sentence-identity": "演算しても相手を変化させない元である。",
    },
    correct: ["sentence-commutative"],
    created: "2026-07-28T00:00:00Z",
    no_correct_option: false,
  },
  {
    quiz_id: "quiz-example",
    statement: "「群」から「整数の加法群」への関係を当ててください",
    options: {
      "sentence-example": "具体例",
      "sentence-detail": "詳細",
      "sentence-premise": "前提",
    },
    correct: ["sentence-example"],
    created: "2026-07-27T12:00:00Z",
    no_correct_option: false,
  },
];

const resources = [
  {
    resource: {
      uid: "resource-algebra",
      name: "代数学の読書メモ",
    },
    total_quizzes: 2,
    quiz_counts: {
      term2sent: 1,
      pair2rel: 1,
    },
    last_created_at: "2026-07-28T00:00:00Z",
  },
  {
    resource: {
      uid: "resource-graph",
      name: "グラフ理論",
    },
    total_quizzes: 8,
    quiz_counts: {
      term2sent: 3,
      sent2term: 3,
      rel2pair: 2,
    },
    last_created_at: "2026-07-27T12:00:00Z",
  },
];

const learningStatus = {
  resource_id: "resource-algebra",
  user_id: "user-1",
  by_quiz_type: {
    term2sent: {
      coverage: { eligible: 10, covered: 8, ratio: 0.8 },
      attempt_rate: { available: 8, attempted: 6, ratio: 0.75 },
      performance: {
        attempts: 10,
        corrects: 7,
        accuracy: 0.7,
        last_attempted_at: null,
      },
    },
    pair2rel: {
      coverage: { eligible: 8, covered: 2, ratio: 0.25 },
      attempt_rate: { available: 2, attempted: 1, ratio: 0.5 },
      performance: {
        attempts: 2,
        corrects: 1,
        accuracy: 0.5,
        last_attempted_at: null,
      },
    },
  },
  overall_coverage: 0.56,
  overall_attempt_rate: 0.7,
  overall_accuracy: 0.67,
  last_attempted_at: null,
};

const meta = {
  title: "Features/Quiz/QuizList",
  component: QuizList,
  parameters: {
    msw: {
      handlers: [
        http.get("*/namespace", () =>
          HttpResponse.json({
            g: {
              directed: true,
              edges: [],
              graph: {},
              multigraph: false,
              nodes: resources.map(({ resource }) => ({ id: resource })),
            },
            roots_: {},
            user_id: "user-preview",
            stats: Object.fromEntries(
              resources.map(({ resource }) => [
                resource.uid,
                { n_sentence: 12 },
              ]),
            ),
          }),
        ),
        http.get("*/quiz/created/resources", () =>
          HttpResponse.json(resources),
        ),
        http.get("*/quiz/learning-progress/:resourceId", ({ params }) =>
          HttpResponse.json({
            ...learningStatus,
            resource_id: params.resourceId,
          }),
        ),
        http.get("*/quiz/created/search", () =>
          HttpResponse.json({
            data: quizzes.map((quiz, index) => ({
              quiz,
              attempts: index + 1,
              corrects: index,
              accuracy: index / (index + 1),
              last_attempted_at: "2026-07-28T01:00:00Z",
            })),
            total: quizzes.length,
          }),
        ),
        http.delete(
          "*/quiz/:quizId",
          () => new HttpResponse(null, { status: 204 }),
        ),
      ],
    },
  },
} satisfies Meta<typeof QuizList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/namespace", () =>
          HttpResponse.json({
            g: {
              directed: true,
              edges: [],
              graph: {},
              multigraph: false,
              nodes: [],
            },
            roots_: {},
            user_id: "user-preview",
            stats: {},
          }),
        ),
        http.get("*/quiz/created/resources", () => HttpResponse.json([])),
      ],
    },
  },
};
