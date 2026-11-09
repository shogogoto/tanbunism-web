import type { QuizChain, QuizRecommendation } from "./api";
import { shuffleOptionIds } from "./optionOrder";

export type SessionRecommendation = QuizRecommendation & {
  optionOrder: string[];
};
export type QuizResult = { isCorrect: boolean; chain: QuizChain };
export type SessionResults = Record<string, QuizResult>;
export type QuizSessionState = {
  recommendations: SessionRecommendation[];
  answers: Record<string, string[]>;
  results: SessionResults;
  activeQuizIndex: number;
  submission:
    | { status: "idle" }
    | { status: "pending" }
    | { status: "failed"; message: string };
};

export const initialQuizSession: QuizSessionState = {
  recommendations: [],
  answers: {},
  results: {},
  activeQuizIndex: 0,
  submission: { status: "idle" },
};

type Action =
  | { type: "reset" }
  | { type: "received"; recommendations: SessionRecommendation[] }
  | { type: "toggle"; quizId: string; optionId: string }
  | { type: "activate"; index: number }
  | { type: "submit" }
  | { type: "settled"; results: SessionResults; failed: number }
  | { type: "retryIncorrect" };

/** Only session transitions: no requests, clocks, focus or cache invalidation. */
export function quizSessionReducer(
  state: QuizSessionState,
  action: Action,
): QuizSessionState {
  switch (action.type) {
    case "reset":
      return initialQuizSession;
    case "received":
      return { ...state, recommendations: action.recommendations };
    case "activate":
      return { ...state, activeQuizIndex: action.index };
    case "toggle": {
      if (state.results[action.quizId] || state.submission.status === "pending")
        return state;
      const selected = state.answers[action.quizId] ?? [];
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.quizId]: selected.includes(action.optionId)
            ? selected.filter((id) => id !== action.optionId)
            : [...selected, action.optionId],
        },
      };
    }
    case "submit":
      return { ...state, submission: { status: "pending" } };
    case "settled":
      return {
        ...state,
        results: { ...state.results, ...action.results },
        submission: action.failed
          ? {
              status: "failed",
              message: `${action.failed}問の回答を送信できませんでした。未送信の問題だけ再実行できます。`,
            }
          : { status: "idle" },
      };
    case "retryIncorrect":
      return {
        ...initialQuizSession,
        recommendations: state.recommendations.filter(
          ({ quiz }) => state.results[quiz.quiz_id]?.isCorrect === false,
        ),
      };
  }
}

/** Keep shuffled order stable when progressive loading returns a duplicate quiz. */
export function mergeRecommendations(
  current: SessionRecommendation[],
  incoming: QuizRecommendation[],
  shuffle = shuffleOptionIds,
): SessionRecommendation[] {
  const orders = new Map(
    current.map(({ quiz, optionOrder }) => [quiz.quiz_id, optionOrder]),
  );
  return [
    ...new Map(
      [
        ...current,
        ...incoming.map((item) => ({
          ...item,
          optionOrder:
            orders.get(item.quiz.quiz_id) ??
            shuffle(Object.keys(item.quiz.options)),
        })),
      ].map((item) => [item.quiz.quiz_id, item]),
    ).values(),
  ];
}

export function sessionProgress(state: QuizSessionState) {
  const pending = state.recommendations.filter(
    ({ quiz }) => !state.results[quiz.quiz_id],
  );
  const unansweredCount = pending.filter(
    ({ quiz }) =>
      !quiz.no_correct_option && !state.answers[quiz.quiz_id]?.length,
  ).length;
  return {
    pending,
    unansweredCount,
    allAnswered: state.recommendations.length > 0 && unansweredCount === 0,
    isComplete: state.recommendations.length > 0 && pending.length === 0,
    answeredCount: state.recommendations.length - pending.length,
  };
}
