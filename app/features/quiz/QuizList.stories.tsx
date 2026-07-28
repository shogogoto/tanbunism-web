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

const meta = {
  title: "Features/Quiz/QuizList",
  component: QuizList,
  parameters: {
    msw: {
      handlers: [
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
        http.get("*/quiz/created", () =>
          HttpResponse.json({ data: [], total: 0 }),
        ),
      ],
    },
  },
};
