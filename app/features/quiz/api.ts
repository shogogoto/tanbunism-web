import {
  answerQuizApiQuizAnswerQuizIdPost,
  createStudyPlanApiQuizStudyPlansPost,
  getNamaspaceNamespaceGet,
  listStudyPlansApiQuizStudyPlansGet,
  recommendStudyPlanQuizzesApiQuizStudyPlansPlanIdRecommendationsPost,
} from "./generated/api";
import type {
  HTTPValidationError,
  QuizChain,
  QuizRecommendationResponse,
  StudyPlan,
  StudyPlanDraft,
} from "./generated/models";

export type { QuizChain, StudyPlan, StudyPlanDraft };
export type QuizRecommendation = QuizRecommendationResponse;
export type StudyResource = {
  uid: string;
  name: string;
};

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

export async function listStudyResources(): Promise<StudyResource[]> {
  const response = await getNamaspaceNamespaceGet({
    credentials: "include",
  });
  const resourceIds = new Set(Object.keys(response.data.stats ?? {}));

  return (response.data.g?.nodes ?? []).flatMap((node) => {
    const entry = node.id as unknown;
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("uid" in entry) ||
      !("name" in entry) ||
      typeof entry.uid !== "string" ||
      typeof entry.name !== "string" ||
      !resourceIds.has(entry.uid)
    ) {
      return [];
    }
    return [{ uid: entry.uid, name: entry.name }];
  });
}

export async function createStudyPlan(
  draft: StudyPlanDraft,
): Promise<StudyPlan> {
  const response = await createStudyPlanApiQuizStudyPlansPost(draft, {
    credentials: "include",
  });
  return unwrap(response, "学習計画を作成できませんでした。");
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
