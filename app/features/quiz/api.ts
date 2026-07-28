import {
  answerQuizApiQuizAnswerQuizIdPost,
  listStudyPlansApiQuizStudyPlansGet,
  recommendStudyPlanQuizzesApiQuizStudyPlansPlanIdRecommendationsPost,
} from "./generated/api";
import type {
  HTTPValidationError,
  QuizChain,
  QuizRecommendationResponse,
  StudyPlan,
} from "./generated/models";

export type { StudyPlan };
export type QuizRecommendation = QuizRecommendationResponse;

export class QuizApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function unwrap<T>(
  response: { data: T | HTTPValidationError; status: number },
  fallbackMessage: string,
): T {
  if (response.status >= 400) {
    throw new QuizApiError(fallbackMessage, response.status);
  }
  return response.data as T;
}

export async function listStudyPlans(): Promise<StudyPlan[]> {
  const response = await listStudyPlansApiQuizStudyPlansGet({
    credentials: "include",
  });
  return unwrap(response, "学習計画を取得できませんでした。");
}

export async function recommendQuizzes(
  planId: string,
): Promise<QuizRecommendation[]> {
  const response =
    await recommendStudyPlanQuizzesApiQuizStudyPlansPlanIdRecommendationsPost(
      planId,
      { credentials: "include" },
    );
  return unwrap(response, "おすすめのクイズを取得できませんでした。");
}

export async function answerQuiz(
  quizId: string,
  selected: string[],
): Promise<QuizChain> {
  const response = await answerQuizApiQuizAnswerQuizIdPost(
    quizId,
    { selected },
    {
      credentials: "include",
    },
  );
  return unwrap(response, "回答を送信できませんでした。");
}
