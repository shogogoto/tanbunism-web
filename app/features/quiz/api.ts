import { recommendationDay } from "~/shared/lib/recommendationDay";
import { invalidateQuizCache, quizCachePolicy, withQuizCache } from "./cache";
import {
  answerQuizApiQuizAnswerQuizIdPost,
  createQuizApiQuizPost,
  createStudyPlanApiQuizStudyPlansPost,
  deleteQuizApiQuizQuizIdDelete,
  deleteStudyPlanApiQuizStudyPlansPlanIdDelete,
  expandQuizChainApiQuizChainQuizzesQuizIdGet,
  getLearningProgressApiQuizLearningProgressResourceIdGet,
  getNamaspaceNamespaceGet,
  getRecommendStudyPlanQuizzesApiQuizStudyPlansPlanIdRecommendationsPostUrl,
  listAnswerHistoryApiQuizAnswersGet,
  listCreatedQuizResourcesQuizCreatedResourcesGet,
  listCreatedQuizSentencesQuizCreatedResourcesResourceIdSentencesGet,
  listCreatedQuizzesQuizCreatedGet,
  listStudyPlansApiQuizStudyPlansGet,
  searchCreatedQuizzesApiQuizCreatedSearchGet,
  updateStudyPlanApiQuizStudyPlansPlanIdPut,
} from "./generated/api";
import type {
  AnswerHistoryItem,
  AnswerHistoryResult,
  ManagedQuiz as GeneratedManagedQuiz,
  HTTPValidationError,
  ListAnswerHistoryApiQuizAnswersGetParams,
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
  AnswerHistoryItem,
  AnswerHistoryResult,
  ListAnswerHistoryApiQuizAnswersGetParams,
  QuizChain,
  QuizResourceStatus,
  ReadableQuiz,
  ResourceLearningStatus,
  ManagedQuizResult,
  SentenceQuizStatus,
  StudyPlan,
  StudyPlanDraft,
};
export type QuizType = StudyPlanDraft["quiz_types"][number];
export type ManagedQuiz = GeneratedManagedQuiz & { answered_today?: boolean };
export type QuizRecommendation = QuizRecommendationResponse & {
  quiz_type: QuizType;
};
export type QuizSearchParams =
  SearchCreatedQuizzesApiQuizCreatedSearchGetParams & {
    q?: string | null;
  };
export type StudyResource = {
  uid: string;
  name: string;
};
export type StudyPlanPreparationStatus = {
  plan_id: string;
  prepared_quiz_count: number;
};
export type PrepareStudyPlanResult = StudyPlanPreparationStatus & {
  requested_count: number;
  added_count: number;
};
export type PrepareStudyPlansAccepted = {
  accepted_count: number;
};
export type DeleteQuizzesResult = {
  deleted_count: number;
  deleted_answer_count: number;
  skipped_count: number;
};
export type QuizReportReason = "undefined" | "incorrect" | "other";
export type QuizReport = {
  quiz_id: string;
  quiz?: ReadableQuiz;
  reason: QuizReportReason;
  detail?: string | null;
  report_count: number;
  resource_id?: string | null;
  resource_name?: string | null;
  updated_at: string;
};

export type ResourceSentenceCandidate = {
  uid: string;
  sentence: string;
};

export type QuizReattachmentResult = {
  quiz_targets: number;
  quiz_options: number;
  quiz_corrects: number;
  retained: boolean;
};

export type BrokenQuizReference = {
  quiz_id: string;
  quiz_type: QuizType;
  retired_sentence_id: string;
  retired_value: string;
  resource_id: string;
  resource_name?: string | null;
  roles: string[];
  retired_at: string;
};

export type UnplannedQuiz = {
  quiz_id: string;
  quiz_type: QuizType;
  resource_id: string;
  resource_name?: string | null;
};
export type QuizIssueSummary = {
  broken_count: number;
  reported_count: number;
  unplanned_count: number;
  total_count: number;
};

export type QuizCacheOptions = {
  waitForRefresh?: boolean;
  forceRefresh?: boolean;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export async function reportQuizIssue(
  quizId: string,
  reason: QuizReportReason,
  detail?: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/quiz/${encodeURIComponent(quizId)}/reports`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, detail: detail || null }),
    },
  );
  if (!response.ok) {
    throw new QuizApiError(
      "クイズの不備を報告できませんでした。",
      response.status,
    );
  }
}

export async function listCreatedQuizReports(): Promise<QuizReport[]> {
  const response = await fetch(`${API_BASE_URL}/quiz/created/reports`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new QuizApiError(
      "クイズの不備報告を取得できませんでした。",
      response.status,
    );
  }
  return (await response.json()) as QuizReport[];
}

export async function dismissReportedQuiz(quizId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/quiz/created/reports/${encodeURIComponent(quizId)}/dismiss`,
    { method: "POST", credentials: "include" },
  );
  if (!response.ok) {
    throw new QuizApiError(
      "不備報告を対応済みにできませんでした。",
      response.status,
    );
  }
}

export async function getQuizIssueSummary(): Promise<QuizIssueSummary> {
  const response = await fetch(`${API_BASE_URL}/quiz/created/issues/summary`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new QuizApiError(
      "要対応の件数を取得できませんでした。",
      response.status,
    );
  }
  return (await response.json()) as QuizIssueSummary;
}

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

export async function listStudyPlans(
  options: QuizCacheOptions = {},
): Promise<StudyPlan[]> {
  return withQuizCache(
    "study-plans",
    {},
    quizCachePolicy.normal,
    async () => {
      const response = await listStudyPlansApiQuizStudyPlansGet({
        credentials: "include",
      });
      return unwrap(response, "学習計画を取得できませんでした。");
    },
    options,
  );
}

export async function listAnswerHistory(
  params: ListAnswerHistoryApiQuizAnswersGetParams = {},
): Promise<AnswerHistoryResult> {
  return withQuizCache(
    "answer-history",
    params,
    quizCachePolicy.live,
    async () => {
      const response = await listAnswerHistoryApiQuizAnswersGet(params, {
        credentials: "include",
      });
      return unwrap(response, "回答履歴を取得できませんでした。");
    },
  );
}

export async function getQuizChain(quizId: string): Promise<QuizChain> {
  return withQuizCache(
    "quiz-chain",
    quizId,
    quizCachePolicy.stable,
    async () => {
      const response = await expandQuizChainApiQuizChainQuizzesQuizIdGet(
        quizId,
        {
          credentials: "include",
        },
      );
      return unwrap(response, "クイズの知識を取得できませんでした。");
    },
  );
}

export async function listStudyResources(
  options: QuizCacheOptions = {},
): Promise<StudyResource[]> {
  return withQuizCache(
    "study-resources",
    {},
    quizCachePolicy.normal,
    async () => {
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
    },
    options,
  );
}

export async function createStudyPlan(
  draft: StudyPlanDraft,
): Promise<StudyPlan> {
  const response = await createStudyPlanApiQuizStudyPlansPost(draft, {
    credentials: "include",
  });
  const plan = unwrap(response, "学習計画を作成できませんでした。");
  await invalidateQuizCache("study-plans", "study-plan-preparations");
  return plan;
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
  const plan = unwrap(response, "学習計画を更新できませんでした。");
  await invalidateQuizCache("study-plans", "study-plan-preparations");
  return plan;
}

export async function deleteStudyPlan(planId: string): Promise<void> {
  const response = await deleteStudyPlanApiQuizStudyPlansPlanIdDelete(planId, {
    credentials: "include",
  });
  if (response.status >= 400) {
    throw new QuizApiError("学習計画を削除できませんでした。", response.status);
  }
  await invalidateQuizCache("study-plans", "study-plan-preparations");
}

export async function listStudyPlanPreparations(
  options: QuizCacheOptions = {},
): Promise<StudyPlanPreparationStatus[]> {
  return withQuizCache(
    "study-plan-preparations",
    {},
    quizCachePolicy.normal,
    () =>
      requestStudyPlanPreparation<StudyPlanPreparationStatus[]>(
        "/quiz/study-plans/preparations",
      ),
    options,
  );
}

export async function prepareAdditionalStudyPlanQuizzes(
  planId: string,
  additionalCount: number,
): Promise<PrepareStudyPlanResult> {
  const result = await requestStudyPlanPreparation<PrepareStudyPlanResult>(
    `/quiz/study-plans/${encodeURIComponent(planId)}/prepare`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ additional_count: additionalCount }),
    },
  );
  await invalidateQuizCache(
    "created-list",
    "created-resources",
    "created-search",
    "created-sentences",
    "learning-progress",
    "study-plan-preparations",
  );
  return result;
}

export async function prepareSelectedStudyPlans(
  planIds: string[],
  additionalCount: number,
): Promise<PrepareStudyPlansAccepted> {
  return requestStudyPlanPreparation<PrepareStudyPlansAccepted>(
    "/quiz/study-plans/prepare",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_ids: planIds,
        additional_count: additionalCount,
      }),
    },
  );
}

async function requestStudyPlanPreparation<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
  });
  const body = await response.text();
  let data: unknown;
  try {
    data = body ? JSON.parse(body) : undefined;
  } catch {
    throw new QuizApiError(
      "クイズAPIからJSONではない応答が返されました。",
      response.status,
    );
  }
  if (!response.ok) {
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? data.detail
        : undefined;
    const message =
      typeof detail === "string"
        ? detail
        : typeof detail === "object" &&
            detail !== null &&
            "message" in detail &&
            typeof detail.message === "string"
          ? detail.message
          : "クイズを準備できませんでした。";
    throw new QuizApiError(message, response.status);
  }
  return data as T;
}

export async function recommendQuizzes(
  planId: string,
  quizType: QuizType,
  {
    generateMissing = true,
    signal,
  }: {
    generateMissing?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<QuizRecommendation[]> {
  const url =
    getRecommendStudyPlanQuizzesApiQuizStudyPlansPlanIdRecommendationsPostUrl(
      planId,
    );
  const response = await fetch(
    `${url}?quiz_type=${encodeURIComponent(quizType)}&generate_missing=${generateMissing}`,
    {
      method: "POST",
      credentials: "include",
      signal,
    },
  );
  const body = await response.text();
  let data: QuizRecommendation[] | HTTPValidationError;
  try {
    data = JSON.parse(body) as QuizRecommendation[] | HTTPValidationError;
  } catch {
    throw new QuizApiError(
      "クイズAPIからJSONではない応答が返されました。しばらく待って再試行してください。",
      response.status,
    );
  }
  const recommendations = unwrap(
    { data, status: response.status },
    "おすすめのクイズを取得できませんでした。",
  );
  if (generateMissing) {
    await invalidateQuizCache(
      "created-list",
      "created-resources",
      "created-search",
      "created-sentences",
      "learning-progress",
    );
  }
  return recommendations.map((recommendation) => ({
    ...recommendation,
    quiz_type: recommendation.quiz_type ?? quizType,
  }));
}

export async function prepareStudyPlanQuizzes(
  plan: StudyPlan,
): Promise<QuizRecommendation[]> {
  const quizTypes = [
    ...plan.quiz_types.filter((quizType) => quizType !== "pair2rel"),
    ...plan.quiz_types.filter((quizType) => quizType === "pair2rel"),
  ];
  const prepared: QuizRecommendation[] = [];

  for (const quizType of quizTypes) {
    prepared.push(
      ...(await recommendQuizzes(plan.uid, quizType, {
        generateMissing: true,
      })),
    );
  }

  return [
    ...new Map(
      prepared.map((recommendation) => [
        recommendation.quiz.quiz_id,
        recommendation,
      ]),
    ).values(),
  ];
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
  const chain = unwrap(response, "回答を送信できませんでした。");
  await invalidateQuizCache(
    "answer-history",
    "created-search",
    "learning-progress",
    "quiz-feed",
    "daily-quizzes",
    "quiz-chain",
  );
  return chain;
}

export async function listCreatedQuizResources(
  options: QuizCacheOptions = {},
): Promise<QuizResourceStatus[]> {
  return withQuizCache(
    "created-resources",
    {},
    quizCachePolicy.normal,
    async () => {
      const response = await listCreatedQuizResourcesQuizCreatedResourcesGet({
        credentials: "include",
      });
      return unwrap(
        response,
        "Resourceごとのクイズ状況を取得できませんでした。",
      );
    },
    options,
  );
}

export async function getLearningProgress(
  resourceId: string,
  options: QuizCacheOptions = {},
): Promise<ResourceLearningStatus> {
  return withQuizCache(
    "learning-progress",
    resourceId,
    quizCachePolicy.live,
    async () => {
      const response =
        await getLearningProgressApiQuizLearningProgressResourceIdGet(
          resourceId,
          { credentials: "include" },
        );
      return unwrap(response, "Resourceの学習状況を取得できませんでした。");
    },
    options,
  );
}

export async function listCreatedQuizSentences(
  resourceId: string,
  options: QuizCacheOptions = {},
): Promise<SentenceQuizStatus[]> {
  return withQuizCache(
    "created-sentences",
    resourceId,
    quizCachePolicy.normal,
    async () => {
      const response =
        await listCreatedQuizSentencesQuizCreatedResourcesResourceIdSentencesGet(
          resourceId,
          { credentials: "include" },
        );
      return unwrap(response, "単文ごとのクイズ状況を取得できませんでした。");
    },
    options,
  );
}

export async function listCreatedQuizzes(
  resourceId?: string,
  sentenceId?: string,
): Promise<ReadableQuiz[]> {
  const params = {
    resource_id: resourceId,
    sentence_id: sentenceId,
    page: 1,
    size: 100,
  };
  return withQuizCache(
    "created-list",
    params,
    quizCachePolicy.normal,
    async () => {
      const response = await listCreatedQuizzesQuizCreatedGet(params, {
        credentials: "include",
      });
      return unwrap(response, "作成したクイズを取得できませんでした。").data;
    },
  );
}

export async function searchCreatedQuizzes(
  params: QuizSearchParams,
  options: QuizCacheOptions = {},
): Promise<ManagedQuizResult> {
  return withQuizCache(
    "created-search",
    params,
    quizCachePolicy.normal,
    async () => {
      const response = await searchCreatedQuizzesApiQuizCreatedSearchGet(
        params,
        { credentials: "include" },
      );
      return unwrap(response, "作成したクイズを検索できませんでした。");
    },
    options,
  );
}

export async function listQuizFeed(
  options: QuizCacheOptions = {},
): Promise<ManagedQuizResult> {
  return withQuizCache(
    "quiz-feed",
    { page: 1, size: 80 },
    quizCachePolicy.live,
    async () => {
      const response = await fetch(`${API_BASE_URL}/quiz/feed?page=1&size=80`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new QuizApiError(
          "みんなのクイズを取得できませんでした。",
          response.status,
        );
      }
      return (await response.json()) as ManagedQuizResult;
    },
    options,
  );
}

export async function listDailyQuizzes(
  personal: boolean,
  options: QuizCacheOptions = {},
  profile = "default",
): Promise<{ data: ManagedQuiz[]; total: number }> {
  return withQuizCache(
    "daily-quizzes",
    { personal, profile, day: recommendationDay() },
    quizCachePolicy.live,
    async () => {
      const response = await fetch(
        `${API_BASE_URL}/quiz/daily?personal=${personal}&profile=${encodeURIComponent(profile)}`,
        { credentials: "include" },
      );
      if (!response.ok) {
        throw new QuizApiError(
          "今日のクイズを取得できませんでした。",
          response.status,
        );
      }
      return response.json();
    },
    options,
  );
}

export async function addDailyQuizzes(
  profile: string,
): Promise<ManagedQuizResult> {
  const response = await fetch(
    `${API_BASE_URL}/quiz/daily/more?profile=${encodeURIComponent(profile)}`,
    { method: "POST", credentials: "include" },
  );
  if (!response.ok)
    throw new QuizApiError(
      "追加のクイズを取得できませんでした。",
      response.status,
    );
  const result = (await response.json()) as ManagedQuizResult;
  await invalidateQuizCache("daily-quizzes");
  return result;
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
  const quiz = unwrap(response, "この単文からクイズを作成できませんでした。");
  await invalidateQuizCache(
    "created-list",
    "created-resources",
    "created-search",
    "created-sentences",
    "learning-progress",
  );
  return quiz;
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
  const quiz = unwrap(response, "関係クイズを作成できませんでした。");
  await invalidateQuizCache(
    "created-list",
    "created-resources",
    "created-search",
    "created-sentences",
    "learning-progress",
  );
  return quiz;
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const response = await deleteQuizApiQuizQuizIdDelete(quizId, {
    credentials: "include",
  });
  if (response.status >= 400) {
    throw new QuizApiError("クイズを削除できませんでした。", response.status);
  }
  await invalidateQuizCache(
    "answer-history",
    "created-list",
    "created-resources",
    "created-search",
    "created-sentences",
    "learning-progress",
    "quiz-chain",
  );
}

export async function deleteQuizzes(
  quizIds: string[],
): Promise<DeleteQuizzesResult> {
  const response = await fetch(`${API_BASE_URL}/quiz/created/delete`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quiz_ids: quizIds }),
  });
  if (!response.ok) {
    throw new QuizApiError(
      "選択したクイズを削除できませんでした。",
      response.status,
    );
  }
  const result = (await response.json()) as DeleteQuizzesResult;
  await invalidateQuizCache(
    "answer-history",
    "created-list",
    "created-resources",
    "created-search",
    "created-sentences",
    "learning-progress",
    "quiz-chain",
  );
  return result;
}

export async function listBrokenQuizReferences(): Promise<
  BrokenQuizReference[]
> {
  const response = await fetch(`${API_BASE_URL}/quiz/created/broken`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new QuizApiError(
      "参照切れクイズを取得できませんでした。",
      response.status,
    );
  }
  return (await response.json()) as BrokenQuizReference[];
}

export async function listUnplannedQuizzes(): Promise<UnplannedQuiz[]> {
  const response = await fetch(`${API_BASE_URL}/quiz/created/unplanned`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new QuizApiError(
      "StudyPlan未所属クイズを取得できませんでした。",
      response.status,
    );
  }
  return (await response.json()) as UnplannedQuiz[];
}

export async function listResourceSentenceCandidates(
  resourceId: string,
): Promise<ResourceSentenceCandidate[]> {
  const response = await fetch(
    `${API_BASE_URL}/resource/${encodeURIComponent(resourceId)}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw new QuizApiError(
      "Resourceの現行単文を取得できませんでした。",
      response.status,
    );
  }
  const detail = (await response.json()) as {
    uids?: Record<string, unknown>;
  };
  return Object.entries(detail.uids ?? {}).flatMap(([uid, value]) =>
    typeof value === "string" ? [{ uid, sentence: value }] : [],
  );
}

export async function repairBrokenQuizReference(
  quizId: string,
  retiredSentenceId: string,
  replacementSentenceId: string,
): Promise<QuizReattachmentResult> {
  const response = await fetch(
    `${API_BASE_URL}/quiz/${encodeURIComponent(quizId)}/broken/${encodeURIComponent(retiredSentenceId)}/reattach`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replacement_sentence_id: replacementSentenceId }),
    },
  );
  if (!response.ok) {
    throw new QuizApiError(
      "クイズの参照を修復できませんでした。",
      response.status,
    );
  }
  const result = (await response.json()) as QuizReattachmentResult;
  await invalidateQuizCache(
    "answer-history",
    "created-list",
    "created-resources",
    "created-search",
    "created-sentences",
    "learning-progress",
    "quiz-chain",
  );
  return result;
}
