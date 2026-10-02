import type { QuizSearchParams, QuizType } from "./api";

export type QuizFilters = {
  query: string;
  quizTypes: QuizType[];
  answered: "" | "true" | "false";
  createdFrom: string;
  createdTo: string;
  minAccuracy: string;
  maxAccuracy: string;
};

export const emptyQuizFilters: QuizFilters = {
  query: "",
  quizTypes: [],
  answered: "",
  createdFrom: "",
  createdTo: "",
  minAccuracy: "",
  maxAccuracy: "",
};

export function toQuizSearchParams(filters: QuizFilters): QuizSearchParams {
  return {
    q: filters.query.trim() || undefined,
    quiz_types: filters.quizTypes.length > 0 ? filters.quizTypes : undefined,
    answered: filters.answered === "" ? undefined : filters.answered === "true",
    created_from: filters.createdFrom
      ? `${filters.createdFrom}T00:00:00+09:00`
      : undefined,
    created_to: filters.createdTo
      ? `${filters.createdTo}T23:59:59+09:00`
      : undefined,
    min_accuracy: filters.minAccuracy
      ? Number(filters.minAccuracy) / 100
      : undefined,
    max_accuracy: filters.maxAccuracy
      ? Number(filters.maxAccuracy) / 100
      : undefined,
  };
}
