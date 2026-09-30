import type { Meta, StoryObj } from "@storybook/react-vite";
import QuizPrompt from "./QuizPrompt";
import type { ReadableQuiz } from "./api";

const baseQuiz: Omit<ReadableQuiz, "quiz_type" | "prompt"> = {
  quiz_id: "quiz-1",
  statement: "互換表示用の問題文",
  options: {},
  correct: [],
  created: "2026-09-30T00:00:00Z",
  no_correct_option: false,
};

const quizzes: ReadableQuiz[] = [
  {
    ...baseQuiz,
    quiz_type: "term2sent",
    prompt: { subject: "構造言語学", answer_kind: "sentence" },
  },
  {
    ...baseQuiz,
    quiz_id: "quiz-2",
    quiz_type: "sent2term",
    prompt: {
      subject: "言語を相互に依存する要素の体系として研究する",
      answer_kind: "term",
    },
  },
  {
    ...baseQuiz,
    quiz_id: "quiz-3",
    quiz_type: "rel2pair",
    prompt: {
      subject: "哺乳類は動物である",
      relations: [{ name: "BELOW", is_forward: true }],
      answer_kind: "sentence",
    },
  },
  {
    ...baseQuiz,
    quiz_id: "quiz-4",
    quiz_type: "pair2rel",
    prompt: {
      subject: "哺乳類は動物である",
      object: "犬は哺乳類である",
      relations: [{ name: null, is_forward: false }],
      answer_kind: "relation",
    },
  },
];

function QuizPromptShowcase() {
  return (
    <div className="grid max-w-3xl gap-4">
      {quizzes.map((quiz) => (
        <div key={quiz.quiz_id} className="rounded-lg border p-4">
          <QuizPrompt quiz={quiz} />
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: "Features/Quiz/QuizPrompt",
  component: QuizPromptShowcase,
} satisfies Meta<typeof QuizPromptShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllQuizTypes: Story = {};
