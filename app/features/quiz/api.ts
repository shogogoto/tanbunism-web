import {
  answerQuizApiQuizAnswerQuizIdPost,
  createQuizApiQuizPost,
  createStudyPlanApiQuizStudyPlansPost,
  deleteQuizApiQuizQuizIdDelete,
  deleteStudyPlanApiQuizStudyPlansPlanIdDelete,
  getLearningProgressApiQuizLearningProgressResourceIdGet,
  getNamaspaceNamespaceGet,
  listCreatedQuizResourcesQuizCreatedResourcesGet,
  listCreatedQuizSentencesQuizCreatedResourcesResourceIdSentencesGet,
  listCreatedQuizzesQuizCreatedGet,
  listStudyPlansApiQuizStudyPlansGet,
  recommendStudyPlanQuizzesApiQuizStudyPlansPlanIdRecommendationsPost,
  searchCreatedQuizzesApiQuizCreatedSearchGet,
  updateStudyPlanApiQuizStudyPlansPlanIdPut,
} from "./generated/api";
import type {
  HTTPValidationError,
  ManagedQuiz,
  ManagedQuizResult,
  QuizChain,
  QuizRecommendationResponse,
  QuizResourceStatus,
  ReadableQuiz,
  ResourceLearningStatus,
  SearchCreatedQuizzesApiQuizCreatedSearchGetParams,
  SentenceQuizStatus,
  StudyPlan,
  StudyPlanDraft,
} from "./generated/models";

export type {
  QuizChain,
  QuizResourceStatus,
  ReadableQuiz,
  ResourceLearningStatus,
  ManagedQuizResult,
  ManagedQuiz,
  SentenceQuizStatus,
  StudyPlan,
  StudyPlanDraft,
};
export type QuizRecommendation = QuizRecommendationResponse;
export type QuizSearchParams =
  SearchCreatedQuizzesApiQuizCreatedSearchGetParams;
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
    const data = response.data as unknown;
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? data.detail
        : undefined;
    const message =
      typeof detail === "object" &&
      detail !== null &&
      "message" in detail &&
      typeof detail.message === "string"
        ? detail.message
        : fallbackMessage;
    throw new QuizApiError(message, response.status);
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
  const normalizeUuid = (value: string) => value.replaceAll("-", "");
  const resourceIds = new Set(
    Object.keys(response.data.stats ?? {}).map(normalizeUuid),
  );

  return (response.data.g?.nodes ?? []).flatMap((node) => {
    const entry = node.id as unknown;
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("uid" in entry) ||
      !("name" in entry) ||
      typeof entry.uid !== "string" ||
      typeof entry.name !== "string" ||
      !resourceIds.has(normalizeUuid(entry.uid))
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

export async function updateStudyPlan(
  planId: string,
  draft: StudyPlanDraft,
): Promise<StudyPlan> {
  const response = await updateStudyPlanApiQuizStudyPlansPlanIdPut(
    planId,
    draft,
    { credentials: "include" },
  );
  return unwrap(response, "学習計画を更新できませんでした。");
}

export async function deleteStudyPlan(planId: string): Promise<void> {
  const response = await deleteStudyPlanApiQuizStudyPlansPlanIdDelete(planId, {
    credentials: "include",
  });
  if (response.status >= 400) {
    throw new QuizApiError("学習計画を削除できませんでした。", response.status);
  }
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

export async function getLearningProgress(
  resourceId: string,
): Promise<ResourceLearningStatus> {
  const response =
    await getLearningProgressApiQuizLearningProgressResourceIdGet(resourceId, {
      credentials: "include",
    });
  return unwrap(response, "Resourceの学習状況を取得できませんでした。");
}

export async function listCreatedQuizSentences(
  resourceId: string,
): Promise<SentenceQuizStatus[]> {
  const response =
    await listCreatedQuizSentencesQuizCreatedResourcesResourceIdSentencesGet(
      resourceId,
      { credentials: "include" },
    );
  return unwrap(response, "単文ごとのクイズ状況を取得できませんでした。");
}

export async function listCreatedQuizzes(
  resourceId?: string,
  sentenceId?: string,
): Promise<ReadableQuiz[]> {
  const response = await listCreatedQuizzesQuizCreatedGet(
    {
      resource_id: resourceId,
      sentence_id: sentenceId,
      page: 1,
      size: 100,
    },
    { credentials: "include" },
  );
  return unwrap(response, "作成したクイズを取得できませんでした。").data;
}

export async function searchCreatedQuizzes(
  params: QuizSearchParams,
): Promise<ManagedQuizResult> {
  const response = await searchCreatedQuizzesApiQuizCreatedSearchGet(params, {
    credentials: "include",
  });
  return unwrap(response, "作成したクイズを検索できませんでした。");
}

export async function createSentenceQuiz(
  sentenceId: string,
  quizType: "sent2term" | "term2sent",
): Promise<ReadableQuiz> {
  const response = await createQuizApiQuizPost(
    {
      target_sent_uid: sentenceId,
      quiz_type: quizType,
      cand_type: "all",
      n_option: 4,
    },
    { credentials: "include" },
  );
  return unwrap(response, "この単文からクイズを作成できませんでした。");
}

export async function createRelationQuiz(
  sentenceId: string,
  relatedSentenceId: string,
  quizType: "rel2pair" | "pair2rel",
): Promise<ReadableQuiz> {
  const response = await createQuizApiQuizPost(
    {
      target_sent_uid: sentenceId,
      correct_sent_uids: [relatedSentenceId],
      quiz_type: quizType,
      cand_type: "all",
      n_option: 4,
    },
    { credentials: "include" },
  );
  return unwrap(response, "関係クイズを作成できませんでした。");
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const response = await deleteQuizApiQuizQuizIdDelete(quizId, {
    credentials: "include",
  });
  if (response.status >= 400) {
    throw new QuizApiError("クイズを削除できませんでした。", response.status);
  }
}
