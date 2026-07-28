import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/shared/components/ui/alert";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import QuizChainReview from "./QuizChainReview";
import StudyPlanForm from "./StudyPlanForm";
import {
  type QuizChain,
  type QuizRecommendation,
  type StudyPlan,
  answerQuiz,
  listStudyPlans,
  recommendQuizzes,
} from "./api";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

export default function QuizSession() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [planId, setPlanId] = useState("");
  const [recommendations, setRecommendations] = useState<QuizRecommendation[]>(
    [],
  );
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean>();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [chain, setChain] = useState<QuizChain>();

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

  useEffect(() => {
    if (!planId) {
      setRecommendations([]);
      return;
    }

    let active = true;
    setLoadState({ status: "loading" });
    setSelected([]);
    setIsCorrect(undefined);
    setChain(undefined);

    async function loadRecommendations() {
      try {
        const loadedRecommendations = await recommendQuizzes(planId);
        if (!active) return;
        setRecommendations(loadedRecommendations);
        setRecommendationIndex(0);
        setLoadState({ status: "ready" });
      } catch (error) {
        if (!active) return;
        setLoadState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "おすすめのクイズを取得できませんでした。",
        });
      }
    }

    loadRecommendations();
    return () => {
      active = false;
    };
  }, [planId]);

  const recommendation = recommendations[recommendationIndex];

  function toggleOption(optionId: string) {
    if (isCorrect !== undefined) return;
    setSelected((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  }

  async function submitAnswer() {
    if (!recommendation) return;
    setIsSubmitting(true);
    try {
      const chain = await answerQuiz(recommendation.quiz.quiz_id, selected);
      setIsCorrect(chain.answers?.[0]?.is_correct ?? false);
      setChain(chain);
    } catch (error) {
      setLoadState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "回答を送信できませんでした。",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function showNextQuiz() {
    setRecommendationIndex((current) => current + 1);
    setSelected([]);
    setIsCorrect(undefined);
    setChain(undefined);
  }

  function handlePlanCreated(plan: StudyPlan) {
    setPlans((current) => [...current, plan]);
    setPlanId(plan.uid);
    setShowPlanForm(false);
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

  if (!recommendation) {
    return (
      <div className="mx-auto max-w-2xl p-6 space-y-4">
        <PlanToolbar
          plans={plans}
          planId={planId}
          onChange={setPlanId}
          onCreate={() => setShowPlanForm(true)}
        />
        {showPlanForm && (
          <Card className="border">
            <CardContent className="pt-4">
              <StudyPlanForm
                onCreated={handlePlanCreated}
                onCancel={() => setShowPlanForm(false)}
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

  const quiz = recommendation.quiz;
  const hasNext = recommendationIndex + 1 < recommendations.length;

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">クイズ</h1>
          <p className="text-sm text-muted-foreground">
            StudyPlanから提案された問題を解きます。
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
        onCreate={() => setShowPlanForm(true)}
      />

      {showPlanForm && (
        <Card className="border">
          <CardContent className="pt-4">
            <StudyPlanForm
              onCreated={handlePlanCreated}
              onCancel={() => setShowPlanForm(false)}
            />
          </CardContent>
        </Card>
      )}

      <Card className="border">
        <CardHeader>
          <CardDescription>
            {recommendationIndex + 1} / {recommendations.length}
          </CardDescription>
          <CardTitle className="text-lg leading-relaxed">
            {quiz.statement}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(quiz.options).map(([id, label]) => {
              const isSelected = selected.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleOption(id)}
                  className={`w-full border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {isCorrect !== undefined && (
            <Alert className="mt-4">
              <AlertTitle>{isCorrect ? "正解です" : "不正解です"}</AlertTitle>
              <AlertDescription>
                {isCorrect
                  ? "回答結果を学習履歴に記録しました。"
                  : "回答結果を記録しました。もう一度関連する単文を見直せます。"}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {isCorrect === undefined ? (
            <Button
              type="button"
              onClick={submitAnswer}
              disabled={
                isSubmitting ||
                (!quiz.no_correct_option && selected.length === 0)
              }
            >
              {isSubmitting ? "送信中…" : "回答する"}
            </Button>
          ) : (
            hasNext && (
              <Button type="button" onClick={showNextQuiz}>
                次の問題
              </Button>
            )
          )}
        </CardFooter>
      </Card>
      {chain && <QuizChainReview chain={chain} />}
    </div>
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
  ...selectorProps
}: Parameters<typeof PlanSelector>[0] & {
  onCreate: () => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <PlanSelector {...selectorProps} />
      </div>
      <Button type="button" variant="outline" onClick={onCreate}>
        新規作成
      </Button>
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
