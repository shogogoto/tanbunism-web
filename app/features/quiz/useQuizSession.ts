import { useEffect, useReducer, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateGamification } from "~/features/gamification/invalidate";
import {
  type QuizType,
  type StudyPlan,
  answerQuiz,
  createStudyPlan,
  listStudyPlans,
  listStudyResources,
  prepareAdditionalStudyPlanQuizzes,
  recommendQuizzes,
} from "./api";
import {
  type SessionRecommendation,
  type SessionResults,
  initialQuizSession,
  mergeRecommendations,
  quizSessionReducer,
  sessionProgress,
} from "./quizSessionState";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

/** Session lifecycle and asynchronous work; rendering and keyboard focus stay in the view. */
export function useQuizSession(requestedPlanId?: string | null) {
  const { mutate } = useSWRConfig();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [planId, setPlanId] = useState("");
  const [session, dispatch] = useReducer(
    quizSessionReducer,
    initialQuizSession,
  );
  const progress = sessionProgress(session);
  const generation = useRef(0);
  const submitting = useRef<number | undefined>(undefined);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [isPreparingRecommendations, setIsPreparingRecommendations] =
    useState(false);
  const [preparingQuizType, setPreparingQuizType] = useState<QuizType>();
  const [preparationError, setPreparationError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isQuickStarting, setIsQuickStarting] = useState(false);
  const [quickStartError, setQuickStartError] = useState<string>();
  useEffect(() => {
    let active = true;

    async function loadPlans() {
      try {
        const loadedPlans = await listStudyPlans();
        if (!active) return;
        setPlans(loadedPlans);
        if (
          requestedPlanId &&
          !loadedPlans.some(({ uid }) => uid === requestedPlanId)
        ) {
          setLoadState({
            status: "error",
            message: "選択した学習計画が見つかりません。",
          });
          return;
        }
        setPlanId(
          loadedPlans.some(({ uid }) => uid === requestedPlanId)
            ? (requestedPlanId ?? "")
            : (loadedPlans[0]?.uid ?? ""),
        );
        // Mark the pending recommendation load before exposing the ready UI.
        // Otherwise the first render briefly looks like a completed empty result.
        setIsPreparingRecommendations(loadedPlans.length > 0);
        setLoadState({ status: "ready" });
      } catch (error) {
        if (!active) return;
        setLoadState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "学習計画を取得できませんでした。",
        });
      }
    }

    loadPlans();
    return () => {
      active = false;
    };
  }, [requestedPlanId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey explicitly reloads recommendations.
  useEffect(() => {
    const current = ++generation.current;
    dispatch({ type: "reset" });
    if (!planId) {
      setIsPreparingRecommendations(false);
      return;
    }

    const plan = plans.find(({ uid }) => uid === planId);
    if (!plan) return;
    const planQuizTypes = [
      ...plan.quiz_types.filter((quizType) => quizType !== "pair2rel"),
      ...plan.quiz_types.filter((quizType) => quizType === "pair2rel"),
    ];

    let active = true;
    const controller = new AbortController();
    setLoadState({ status: "ready" });
    setIsPreparingRecommendations(true);
    setPreparationError(undefined);

    async function loadRecommendations() {
      let accumulated: SessionRecommendation[] = [];
      const errors: string[] = [];
      for (const quizType of planQuizTypes) {
        if (!active) return;
        setPreparingQuizType(quizType);
        try {
          const loaded = await recommendQuizzes(planId, quizType, {
            generateMissing: false,
            signal: controller.signal,
          });
          if (!active) return;
          accumulated = mergeRecommendations(accumulated, loaded);
          dispatch({ type: "received", recommendations: accumulated });
        } catch (error) {
          if (!active || controller.signal.aborted) return;
          errors.push(
            error instanceof Error
              ? error.message
              : `${quizType}のクイズを取得できませんでした。`,
          );
        }
      }
      if (!active) return;
      setPreparingQuizType(undefined);
      setIsPreparingRecommendations(false);
      if (errors.length > 0 && accumulated.length === 0) {
        setLoadState({
          status: "error",
          message: errors[0],
        });
      } else if (errors.length > 0) {
        setPreparationError(
          `${errors.length}形式のクイズを取得できませんでした。取得済みの問題は回答できます。`,
        );
      }
    }

    loadRecommendations();
    return () => {
      active = false;
      if (generation.current === current) generation.current++;
      controller.abort();
    };
  }, [planId, plans, refreshKey]);

  function toggleOption(quizId: string, optionId: string) {
    dispatch({ type: "toggle", quizId, optionId });
  }
  function setActiveQuizIndex(index: number) {
    dispatch({ type: "activate", index });
  }
  function retryIncorrectQuizzes() {
    dispatch({ type: "retryIncorrect" });
  }
  function requestNew() {
    setRefreshKey((current) => current + 1);
  }

  async function submitAnswers() {
    const current = generation.current;
    if (!progress.pending.length || submitting.current === current) return;
    submitting.current = current;
    dispatch({ type: "submit" });
    const settled = await Promise.allSettled(
      progress.pending.map(async ({ quiz }) => ({
        quizId: quiz.quiz_id,
        chain: await answerQuiz(
          quiz.quiz_id,
          session.answers[quiz.quiz_id] ?? [],
        ),
      })),
    );
    const results: SessionResults = {};
    let failed = 0;
    for (const result of settled) {
      if (result.status === "rejected") {
        failed++;
        continue;
      }
      results[result.value.quizId] = {
        chain: result.value.chain,
        isCorrect: result.value.chain.answers?.[0]?.is_correct ?? false,
      };
    }
    // Successful writes count even if the user has since changed plans.
    if (Object.keys(results).length)
      void invalidateGamification(mutate, { preserveData: true }).catch(
        () => undefined,
      );
    if (submitting.current === current) submitting.current = undefined;
    if (generation.current === current)
      dispatch({ type: "settled", results, failed });
  }
  async function quickStart() {
    setIsQuickStarting(true);
    setQuickStartError(undefined);
    try {
      const resources = await listStudyResources();
      if (resources.length === 0) {
        throw new Error("学習対象にできるResourceがありません。");
      }
      const plan = await createStudyPlan({
        name: "おまかせ",
        resource_ids: resources.slice(0, 20).map(({ uid }) => uid),
        quiz_types: ["term2sent", "sent2term", "rel2pair", "pair2rel"],
        n_quiz: 5,
        n_option: 4,
      });
      await prepareAdditionalStudyPlanQuizzes(plan.uid, plan.n_quiz);
      setPlans([plan]);
      setPlanId(plan.uid);
    } catch (caught) {
      setQuickStartError(
        caught instanceof Error
          ? caught.message
          : "おまかせ学習を開始できませんでした。",
      );
    } finally {
      setIsQuickStarting(false);
    }
  }

  return {
    ...session,
    ...progress,
    plans,
    planId,
    setPlanId,
    loadState,
    isSubmitting: session.submission.status === "pending",
    submitError:
      session.submission.status === "failed"
        ? session.submission.message
        : undefined,
    isPreparingRecommendations,
    preparingQuizType,
    preparationError,
    isQuickStarting,
    quickStartError,
    quickStart,
    toggleOption,
    setActiveQuizIndex,
    submitAnswers,
    retryIncorrectQuizzes,
    requestNew,
  };
}
