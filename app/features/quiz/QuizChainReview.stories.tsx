import type { Meta, StoryObj } from "@storybook/react-vite";
import QuizChainReview from "./QuizChainReview";
import type { QuizChain } from "./api";

const stats = {
  n_detail: 0,
  n_premise: 0,
  n_conclusion: 0,
  n_refer: 0,
  n_referred: 0,
};

const termChain: QuizChain = {
  sentences: [
    {
      uid: "sentence-commutative",
      sentence: "演算の順序を交換しても結果が変わらない性質である。",
      term: { names: ["可換"] },
      stats,
      resource_uid: "resource-algebra",
    },
  ],
  quizzes: [
    {
      quiz_id: "quiz-term",
      quiz_type: "term2sent",
      readable: {
        quiz_id: "quiz-term",
        statement: "「可換」に合う文を当ててください",
        options: {
          "sentence-commutative":
            "演算の順序を交換しても結果が変わらない性質である。",
        },
        correct: ["sentence-commutative"],
        created: "2026-07-28T00:00:00Z",
        no_correct_option: false,
      },
    },
  ],
  links: [
    {
      quiz_id: "quiz-term",
      sentence_id: "sentence-commutative",
      role: "target",
      relations: [],
    },
    {
      quiz_id: "quiz-term",
      sentence_id: "sentence-commutative",
      role: "correct",
      relations: [],
    },
  ],
  answers: [],
};

const relationChain: QuizChain = {
  sentences: [
    {
      uid: "sentence-group",
      sentence: "群は、結合法則・単位元・逆元を備えた代数系である。",
      term: { names: ["群"] },
      stats,
      resource_uid: "resource-algebra",
    },
    {
      uid: "sentence-integer-group",
      sentence: "整数全体は加法について群をなす。",
      term: { names: ["整数の加法群"] },
      stats,
      resource_uid: "resource-algebra",
    },
    {
      uid: "sentence-ring",
      sentence: "環は加法と乗法を備えた代数系である。",
      term: { names: ["環"] },
      stats,
      resource_uid: "resource-algebra",
    },
  ],
  quizzes: [
    {
      quiz_id: "quiz-relation",
      quiz_type: "pair2rel",
      readable: {
        quiz_id: "quiz-relation",
        statement: "「群」から「整数の加法群」への関係を当ててください",
        options: {
          "sentence-integer-group": "具体例",
          "sentence-ring": "同階層",
        },
        correct: ["sentence-integer-group"],
        created: "2026-07-28T00:00:00Z",
        no_correct_option: false,
      },
    },
  ],
  links: [
    {
      quiz_id: "quiz-relation",
      sentence_id: "sentence-group",
      role: "target",
      relations: [],
    },
    {
      quiz_id: "quiz-relation",
      sentence_id: "sentence-integer-group",
      role: "correct",
      relations: ["具体例"],
    },
    {
      quiz_id: "quiz-relation",
      sentence_id: "sentence-ring",
      role: "option",
      relations: ["同階層"],
    },
  ],
  answers: [],
};

const meta = {
  title: "Features/Quiz/QuizChainReview",
  component: QuizChainReview,
} satisfies Meta<typeof QuizChainReview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TermAndSentence: Story = {
  args: { chain: termChain },
};

export const SentenceRelation: Story = {
  args: { chain: relationChain },
};
