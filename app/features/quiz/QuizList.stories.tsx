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

const meta = {
  title: "Features/Quiz/QuizList",
  component: QuizList,
  parameters: {
    msw: {
      handlers: [
        http.get("*/quiz/created/resources", () =>
          HttpResponse.json(resources),
        ),
        http.get("*/quiz/created", () =>
          HttpResponse.json({ data: quizzes, total: quizzes.length }),
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
        http.get("*/quiz/created/resources", () => HttpResponse.json([])),
      ],
    },
  },
};
