import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/shared/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/shared/components/ui/alert-dialog";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import QuizChainReview from "./QuizChainReview";
import StudyPlanForm from "./StudyPlanForm";
import {
  type QuizChain,
  type QuizRecommendation,
  type QuizType,
  type StudyPlan,
  answerQuiz,
  deleteStudyPlan,
  listStudyPlans,
  recommendQuizzes,
} from "./api";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

type QuizResult = {
  isCorrect: boolean;
  chain: QuizChain;
};

export default function QuizSession() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [planId, setPlanId] = useState("");
  const [recommendations, setRecommendations] = useState<QuizRecommendation[]>(
    [],
  );
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [results, setResults] = useState<Record<string, QuizResult>>({});
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingRecommendations, setIsPreparingRecommendations] =
    useState(false);
  const [preparingQuizType, setPreparingQuizType] = useState<QuizType>();
  const [preparationPhase, setPreparationPhase] = useState<
    "existing" | "generating"
  >("existing");
  const [preparationError, setPreparationError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudyPlan>();
  const [refreshKey, setRefreshKey] = useState(0);
  const sessionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function loadPlans() {
      try {
        const loadedPlans = await listStudyPlans();
        if (!active) return;
        setPlans(loadedPlans);
        setPlanId(loadedPlans[0]?.uid ?? "");
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
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey explicitly reloads recommendations.
  useEffect(() => {
    if (!planId) {
      setRecommendations([]);
      setIsPreparingRecommendations(false);
      return;
    }

    const plan = plans.find(({ uid }) => uid === planId);
    if (!plan) return;
    const planQuizTypes = plan.quiz_types;

    let active = true;
    const controller = new AbortController();
    setLoadState({ status: "ready" });
    setIsPreparingRecommendations(true);
    setPreparationError(undefined);
    setRecommendations([]);
    setAnswers({});
    setResults({});
    setActiveQuizIndex(0);
    setSubmitError(undefined);

    async function loadRecommendations() {
      let accumulated: QuizRecommendation[] = [];
      const errors: string[] = [];
      for (const phase of ["existing", "generating"] as const) {
        setPreparationPhase(phase);
        for (const quizType of planQuizTypes) {
          if (!active) return;
          setPreparingQuizType(quizType);
          try {
            const loaded = await recommendQuizzes(planId, quizType, {
              generateMissing: phase === "generating",
              signal: controller.signal,
            });
            if (!active) return;
            const byId = new Map(
              [...accumulated, ...loaded].map((item) => [
                item.quiz.quiz_id,
                item,
              ]),
            );
            accumulated = [...byId.values()];
            setRecommendations(accumulated);
          } catch (error) {
            if (!active || controller.signal.aborted) return;
            errors.push(
              error instanceof Error
                ? error.message
                : `${quizType}のクイズを取得できませんでした。`,
            );
          }
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
          `${errors.length}形式のクイズを準備できませんでした。取得済みの問題は回答できます。`,
        );
      }
    }

    loadRecommendations();
    return () => {
      active = false;
      controller.abort();
    };
  }, [planId, plans, refreshKey]);

  useEffect(() => {
    if (recommendations.length > 0) sessionRef.current?.focus();
  }, [recommendations]);

  function toggleOption(quizId: string, optionId: string) {
    if (results[quizId]) return;
    setAnswers((current) => {
      const selected = current[quizId] ?? [];
      return {
        ...current,
        [quizId]: selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId],
      };
    });
  }

  async function submitAnswers() {
    const pending = recommendations.filter(
      ({ quiz }) => results[quiz.quiz_id] === undefined,
    );
    if (pending.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(undefined);

    const settled = await Promise.allSettled(
      pending.map(async ({ quiz }) => ({
        quizId: quiz.quiz_id,
        chain: await answerQuiz(quiz.quiz_id, answers[quiz.quiz_id] ?? []),
      })),
    );
    const succeeded: Record<string, QuizResult> = {};
    let failed = 0;
    for (const result of settled) {
      if (result.status === "rejected") {
        failed += 1;
        continue;
      }
      succeeded[result.value.quizId] = {
        chain: result.value.chain,
        isCorrect: result.value.chain.answers?.[0]?.is_correct ?? false,
      };
    }
    setResults((current) => ({ ...current, ...succeeded }));
    if (failed > 0) {
      setSubmitError(
        `${failed}問の回答を送信できませんでした。未送信の問題だけ再実行できます。`,
      );
    }
    setIsSubmitting(false);
  }

  function handlePlanCreated(plan: StudyPlan) {
    setPlans((current) => [...current, plan]);
    setPlanId(plan.uid);
    setShowPlanForm(false);
  }

  function handlePlanUpdated(plan: StudyPlan) {
    setPlans((current) =>
      current.map((item) => (item.uid === plan.uid ? plan : item)),
    );
    setEditingPlan(undefined);
    setRefreshKey((current) => current + 1);
  }

  async function handlePlanDeleted() {
    await deleteStudyPlan(planId);
    const remaining = plans.filter((plan) => plan.uid !== planId);
    setPlans(remaining);
    setPlanId(remaining[0]?.uid ?? "");
    setEditingPlan(undefined);
  }

  function retryIncorrectQuizzes() {
    setRecommendations((current) =>
      current.filter(({ quiz }) => results[quiz.quiz_id]?.isCorrect === false),
    );
    setAnswers({});
    setResults({});
    setActiveQuizIndex(0);
    setSubmitError(undefined);
  }

  const unansweredCount = recommendations.filter(({ quiz }) => {
    if (results[quiz.quiz_id]) return false;
    return (
      !quiz.no_correct_option && (answers[quiz.quiz_id]?.length ?? 0) === 0
    );
  }).length;
  const allAnswered = recommendations.length > 0 && unansweredCount === 0;
  const isComplete =
    recommendations.length > 0 &&
    recommendations.every(({ quiz }) => results[quiz.quiz_id] !== undefined);
  const selectedPlan = plans.find(({ uid }) => uid === planId);
  const expectedQuizCount = selectedPlan
    ? Math.max(selectedPlan.n_quiz, selectedPlan.quiz_types.length)
    : recommendations.length;

  function handleSessionKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (
      event.key === "Enter" &&
      (event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLAnchorElement)
    ) {
      return;
    }
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const activeRecommendation = recommendations[activeQuizIndex];
    const optionIds = activeRecommendation
      ? Object.keys(activeRecommendation.quiz.options)
      : [];
    const optionIndex = Number(event.key) - 1;
    if (
      activeRecommendation &&
      results[activeRecommendation.quiz.quiz_id] === undefined &&
      Number.isInteger(optionIndex) &&
      optionIndex >= 0 &&
      optionIndex < optionIds.length
    ) {
      event.preventDefault();
      toggleOption(activeRecommendation.quiz.quiz_id, optionIds[optionIndex]);
      return;
    }

    if (event.key !== "Enter") return;
    event.preventDefault();
    if (allAnswered && !isSubmitting && !isComplete) void submitAnswers();
  }

  if (loadState.status === "loading") {
    return <p className="p-6">クイズを準備しています…</p>;
  }

  if (loadState.status === "error") {
    return (
      <Alert variant="destructive" className="m-6 max-w-2xl">
        <AlertTitle>クイズを開始できませんでした</AlertTitle>
        <AlertDescription>{loadState.message}</AlertDescription>
      </Alert>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">学習計画を作る</h1>
          <p className="text-sm text-muted-foreground">
            学習するリソースとクイズ形式を選んでください。
          </p>
        </header>
        <Card className="border">
          <CardContent className="pt-4">
            <StudyPlanForm onCreated={handlePlanCreated} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (recommendations.length === 0 && !isPreparingRecommendations) {
    return (
      <div className="mx-auto max-w-2xl p-6 space-y-4">
        <PlanToolbar
          plans={plans}
          planId={planId}
          onChange={setPlanId}
          onCreate={() => {
            setEditingPlan(undefined);
            setShowPlanForm(true);
          }}
          onEdit={() => setEditingPlan(plans.find(({ uid }) => uid === planId))}
          onDelete={handlePlanDeleted}
        />
        {(showPlanForm || editingPlan) && (
          <Card className="border">
            <CardContent className="pt-4">
              <StudyPlanForm
                plan={editingPlan}
                onCreated={handlePlanCreated}
                onUpdated={handlePlanUpdated}
                onCancel={() => {
                  setShowPlanForm(false);
                  setEditingPlan(undefined);
                }}
              />
            </CardContent>
          </Card>
        )}
        <EmptyState
          title="提案できるクイズがありません"
          description="このStudyPlanの対象リソースやクイズ設定を見直してください。"
        />
      </div>
    );
  }

  return (
    <div
      ref={sessionRef}
      tabIndex={-1}
      onKeyDown={handleSessionKeyDown}
      className="mx-auto max-w-5xl p-4 sm:p-6 space-y-4 outline-none"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">クイズ</h1>
          <p className="text-sm text-muted-foreground">
            StudyPlanから提案された問題を解きます。
          </p>
          <p className="text-xs text-muted-foreground">
            問題を選び、数字キーで回答 · Enterでまとめて送信
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/quiz/list">一覧</Link>
        </Button>
      </header>

      <PlanToolbar
        plans={plans}
        planId={planId}
        onChange={setPlanId}
        onCreate={() => {
          setEditingPlan(undefined);
          setShowPlanForm(true);
        }}
        onEdit={() => setEditingPlan(plans.find(({ uid }) => uid === planId))}
        onDelete={handlePlanDeleted}
      />

      {(showPlanForm || editingPlan) && (
        <Card className="border">
          <CardContent className="pt-4">
            <StudyPlanForm
              plan={editingPlan}
              onCreated={handlePlanCreated}
              onUpdated={handlePlanUpdated}
              onCancel={() => {
                setShowPlanForm(false);
                setEditingPlan(undefined);
              }}
            />
          </CardContent>
        </Card>
      )}

      {isPreparingRecommendations && (
        <Card className="border">
          <CardContent className="py-4">
            <p className="font-medium">
              {preparingQuizType
                ? preparationPhase === "existing"
                  ? `既存の${quizTypeLabels[preparingQuizType]}を確認しています…`
                  : `${quizTypeLabels[preparingQuizType]}を作成しています…`
                : "クイズを準備しています…"}
            </p>
            {recommendations.length > 0 && (
              <p className="text-sm text-muted-foreground">
                届いた問題から回答を選べます。
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {preparationError && (
        <Alert variant="destructive">
          <AlertDescription>{preparationError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {recommendations.map((recommendation, index) => {
          const quizId = recommendation.quiz.quiz_id;
          return (
            <QuizQuestion
              key={quizId}
              index={index}
              total={expectedQuizCount}
              recommendation={recommendation}
              selected={answers[quizId] ?? []}
              result={results[quizId]}
              isActive={index === activeQuizIndex}
              onActivate={() => setActiveQuizIndex(index)}
              onToggle={(optionId) => toggleOption(quizId, optionId)}
            />
          );
        })}
      </div>

      {recommendations.length > 0 && !isComplete && (
        <Card className="sticky bottom-3 border shadow-lg">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="font-medium">
                {unansweredCount > 0
                  ? `未回答 ${unansweredCount}問`
                  : `${recommendations.length}問すべて回答済み`}
              </p>
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
            </div>
            <Button
              type="button"
              onClick={submitAnswers}
              disabled={
                !allAnswered || isSubmitting || isPreparingRecommendations
              }
            >
              {isSubmitting ? "送信中…" : "まとめて回答"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isComplete && (
        <SessionSummary
          recommendations={recommendations}
          results={recommendations.map(
            ({ quiz }) => results[quiz.quiz_id].isCorrect,
          )}
          onRetryIncorrect={retryIncorrectQuizzes}
          onRequestNew={() => setRefreshKey((current) => current + 1)}
        />
      )}
    </div>
  );
}

function QuizQuestion({
  index,
  total,
  recommendation,
  selected,
  result,
  isActive,
  onActivate,
  onToggle,
}: {
  index: number;
  total: number;
  recommendation: QuizRecommendation;
  selected: string[];
  result?: QuizResult;
  isActive: boolean;
  onActivate: () => void;
  onToggle: (optionId: string) => void;
}) {
  const { quiz } = recommendation;

  return (
    <div onFocusCapture={onActivate}>
      <Card className={`border ${isActive ? "ring-2 ring-primary/40" : ""}`}>
        <div
          className={
            result
              ? "grid lg:grid-cols-[minmax(0,3fr)_minmax(18rem,2fr)]"
              : undefined
          }
        >
          <div>
            <CardHeader>
              <CardDescription>
                <span className="flex flex-wrap items-center gap-2">
                  <span>
                    {index + 1} / {total}
                  </span>
                  <Badge variant="outline">
                    {recommendation.quiz_type.toUpperCase()}
                  </Badge>
                  <RecommendationReason reason={recommendation.reason} />
                  {result && (
                    <Badge
                      variant={result.isCorrect ? "default" : "destructive"}
                    >
                      {result.isCorrect ? "正解" : "不正解"}
                    </Badge>
                  )}
                </span>
              </CardDescription>
              <CardTitle className="text-lg leading-relaxed">
                {quiz.statement}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(quiz.options).map(
                  ([id, label], optionIndex) => {
                    const isSelected = selected.includes(id);
                    const isAnswerCorrect =
                      result !== undefined && quiz.correct.includes(id);
                    const isSelectedWrong =
                      result !== undefined && isSelected && !isAnswerCorrect;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={result !== undefined}
                        onClick={() => {
                          onActivate();
                          onToggle(id);
                        }}
                        className={`w-full border p-3 text-left transition-colors disabled:opacity-100 ${
                          isAnswerCorrect
                            ? "border-green-600 bg-green-500/10"
                            : isSelectedWrong
                              ? "border-destructive bg-destructive/10"
                              : isSelected
                                ? "border-primary bg-primary/10"
                                : "hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span>
                            {optionIndex + 1}. {label}
                          </span>
                          {isAnswerCorrect && <Badge>正解</Badge>}
                          {isSelectedWrong && (
                            <Badge variant="destructive">あなたの回答</Badge>
                          )}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
              {result && (
                <Alert className="mt-4">
                  <AlertTitle>
                    {result.isCorrect ? "正解です" : "不正解です"}
                  </AlertTitle>
                  <AlertDescription>
                    {result.isCorrect
                      ? "回答結果を学習履歴に記録しました。"
                      : "回答結果を記録しました。関連する単文を見直せます。"}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </div>
          {result && (
            <aside
              aria-label="このクイズの知識"
              className="border-t bg-muted/20 p-4 lg:border-t-0 lg:border-l"
            >
              <QuizChainReview chain={result.chain} />
            </aside>
          )}
        </div>
      </Card>
    </div>
  );
}

const recommendationReasonLabels = {
  unattempted: "未回答のクイズ",
  low_accuracy: "正答率が低いため復習",
  coverage: "Coverageを広げる",
} as const;

const quizTypeLabels: Record<QuizType, string> = {
  term2sent: "用語から単文",
  sent2term: "単文から用語",
  rel2pair: "関係から単文の組",
  pair2rel: "単文の組から関係",
};

function RecommendationReason({
  reason,
}: {
  reason: keyof typeof recommendationReasonLabels;
}) {
  return (
    <Badge variant="secondary">{recommendationReasonLabels[reason]}</Badge>
  );
}

function SessionSummary({
  recommendations,
  results,
  onRetryIncorrect,
  onRequestNew,
}: {
  recommendations: QuizRecommendation[];
  results: boolean[];
  onRetryIncorrect: () => void;
  onRequestNew: () => void;
}) {
  const correctCount = results.filter(Boolean).length;
  const resourceIds = [
    ...new Set(recommendations.map(({ resource_id }) => resource_id)),
  ];

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle>今回の学習結果</CardTitle>
        <CardDescription>
          {results.length}問中 {correctCount}問正解しました。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {correctCount < results.length && (
          <Button type="button" onClick={onRetryIncorrect}>
            間違えた問題をもう一度
          </Button>
        )}
        <Button type="button" variant="outline" onClick={onRequestNew}>
          新しい推薦を取得
        </Button>
        {resourceIds.map((resourceId) => (
          <Button key={resourceId} asChild variant="ghost">
            <Link to={`/resource/${resourceId}`}>Resourceへ戻る</Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function PlanSelector({
  plans,
  planId,
  onChange,
}: {
  plans: StudyPlan[];
  planId: string;
  onChange: (planId: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm" htmlFor="study-plan">
      StudyPlan
      <select
        id="study-plan"
        value={planId}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 border bg-background px-3"
      >
        {plans.map((plan) => (
          <option key={plan.uid} value={plan.uid}>
            {plan.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function PlanToolbar({
  onCreate,
  onEdit,
  onDelete,
  ...selectorProps
}: Parameters<typeof PlanSelector>[0] & {
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <PlanSelector {...selectorProps} />
      </div>
      <Button type="button" variant="outline" onClick={onCreate}>
        新規作成
      </Button>
      <Button type="button" variant="outline" onClick={onEdit}>
        編集
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost">
            削除
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>StudyPlanを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              クイズや回答履歴は削除されません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onDelete()}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="mx-auto max-w-2xl border">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
