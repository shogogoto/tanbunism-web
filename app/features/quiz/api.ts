import {
  answerQuizApiQuizAnswerQuizIdPost,
  createStudyPlanApiQuizStudyPlansPost,
  deleteQuizApiQuizQuizIdDelete,
  getNamaspaceNamespaceGet,
  listCreatedQuizResourcesQuizCreatedResourcesGet,
  listCreatedQuizzesQuizCreatedGet,
  listStudyPlansApiQuizStudyPlansGet,
  recommendStudyPlanQuizzesApiQuizStudyPlansPlanIdRecommendationsPost,
} from "./generated/api";
import type {
  HTTPValidationError,
  QuizChain,
  QuizRecommendationResponse,
  QuizResourceStatus,
  ReadableQuiz,
  StudyPlan,
  StudyPlanDraft,
} from "./generated/models";

export type {
  QuizChain,
  QuizResourceStatus,
  ReadableQuiz,
  StudyPlan,
  StudyPlanDraft,
};
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

export async function listCreatedQuizResources(): Promise<
  QuizResourceStatus[]
> {
  const response = await listCreatedQuizResourcesQuizCreatedResourcesGet({
    credentials: "include",
  });
  return unwrap(response, "Resourceごとのクイズ状況を取得できませんでした。");
}

export async function listCreatedQuizzes(
  resourceId?: string,
): Promise<ReadableQuiz[]> {
  const response = await listCreatedQuizzesQuizCreatedGet(
    { resource_id: resourceId, page: 1, size: 100 },
    { credentials: "include" },
  );
  return unwrap(response, "作成したクイズを取得できませんでした。").data;
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const response = await deleteQuizApiQuizQuizIdDelete(quizId, {
    credentials: "include",
  });
  if (response.status >= 400) {
    throw new QuizApiError("クイズを削除できませんでした。", response.status);
  }
}
