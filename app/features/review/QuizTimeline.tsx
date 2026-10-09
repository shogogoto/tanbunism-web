import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPreviewPrompt from "~/features/quiz/QuizPreviewPrompt";
import {
  type ManagedQuiz,
  addDailyQuizzes,
  listDailyQuizzes,
} from "~/features/quiz/api";
import { useQuizSWR } from "~/features/quiz/useQuizSWR";
import Loading from "~/shared/components/Loading";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";
import { useRecommendationDay } from "~/shared/lib/recommendationDay";
import { cn } from "~/shared/lib/utils";
import { usePublishReviewProgress } from "./ReviewProgress";

const REVIEW_ACCURACY_THRESHOLD = 0.8;

export default function QuizTimeline({
  scope = "personal",
  profile = "default",
  selectedDay,
}: {
  scope?: "personal" | "global";
  profile?: string;
  selectedDay?: string;
}) {
  const today = useRecommendationDay();
  const day = selectedDay ?? today;
  return (
    <DailyQuizTimeline
      key={`${scope}:${profile}:${day}`}
      scope={scope}
      day={day}
      profile={profile}
      historical={day !== today}
    />
  );
}

function DailyQuizTimeline({
  scope,
  day,
  profile,
  historical,
}: {
  scope: "personal" | "global";
  day: string;
  profile: string;
  historical: boolean;
}) {
  const [sessionResults, setSessionResults] = useState<Record<string, boolean>>(
    {},
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [adding, setAdding] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const {
    data: quizzes = [],
    error,
    isLoading,
    mutate,
  } = useQuizSWR<ManagedQuiz[]>(
    ["daily-quiz-timeline", scope, profile, day],
    async (cacheOptions) => {
      return (
        await listDailyQuizzes(scope === "personal", cacheOptions, profile, day)
      ).data;
    },
    {
      dedupingInterval: 30_000,
      keepPreviousData: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const sorted = quizzes;
  const timelineRef = useRef<HTMLDivElement>(null);
  function moveFromBottom(index: number) {
    setCurrentIndex(index);
    timelineRef.current?.scrollIntoView?.({
      block: "start",
      behavior: "smooth",
    });
  }
  const completed = sorted.filter(
    (item) =>
      item.answered_in_set ||
      item.answered_today ||
      item.quiz.quiz_id in sessionResults,
  ).length;
  usePublishReviewProgress(
    "quiz",
    profile,
    day,
    completed,
    sorted.length,
    scope === "personal" && !isLoading && !error,
  );

  async function addMore() {
    setAdding(true);
    setActionError(undefined);
    try {
      const result = await addDailyQuizzes(profile);
      setExhausted(
        result.data.length === sorted.length || result.data.length >= 500,
      );
      await mutate(result.data, { revalidate: false });
      if (result.data.length > sorted.length) setCurrentIndex(sorted.length);
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "追加できませんでした。",
      );
    } finally {
      setAdding(false);
    }
  }

  useEffect(() => {
    setCurrentIndex((current) =>
      Math.min(current, Math.max(0, sorted.length - 1)),
    );
  }, [sorted.length]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div
      ref={timelineRef}
      className="mx-auto w-full max-w-3xl space-y-2 pb-16 sm:pb-0"
      data-quiz-timeline
    >
      {actionError && (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="border border-destructive/50 p-2 text-sm text-destructive"
        >
          {error instanceof Error
            ? error.message
            : "クイズTLを取得できませんでした。"}
        </p>
      )}
      {scope === "personal" &&
        !historical &&
        sorted.length > 0 &&
        completed === sorted.length && (
          <div className="py-2 text-center">
            <Button
              variant="outline"
              disabled={adding || exhausted}
              onClick={() => void addMore()}
            >
              {exhausted
                ? "今日の追加候補はありません"
                : adding
                  ? "選んでいます…"
                  : "もう少し復習する"}
            </Button>
          </div>
        )}
      {sorted.length === 0 && !error && (
        <p className="border p-2 text-sm text-muted-foreground">
          {historical
            ? "この日のクイズセットは保存されていません。"
            : scope === "global"
              ? "回答できるクイズはまだありません。"
              : "この設定に合うクイズはありません。対象リソースを見直すか、学習計画でクイズを準備してください。"}
        </p>
      )}
      {sorted.length > 0 && (
        <div className="border-y sm:border-x">
          <QuizTimelinePager
            currentIndex={currentIndex}
            quizIds={sorted.map((item) => item.quiz.quiz_id)}
            completedIds={
              new Set(
                sorted
                  .filter(
                    (item) =>
                      item.answered_in_set ||
                      item.answered_today ||
                      item.quiz.quiz_id in sessionResults,
                  )
                  .map((item) => item.quiz.quiz_id),
              )
            }
            onChange={setCurrentIndex}
          />
          <div>
            {sorted.map((item, index) => (
              <div key={item.quiz.quiz_id} hidden={index !== currentIndex}>
                <QuizTimelineCard
                  item={item}
                  isCurrent={index === currentIndex}
                  sessionResult={sessionResults[item.quiz.quiz_id]}
                  hasSessionResult={item.quiz.quiz_id in sessionResults}
                  onAnswered={(isCorrect) => {
                    setSessionResults((current) => ({
                      ...current,
                      [item.quiz.quiz_id]: isCorrect,
                    }));
                    void mutate(
                      (current) =>
                        current?.map((candidate) =>
                          candidate.quiz.quiz_id === item.quiz.quiz_id
                            ? { ...candidate, answered_today: true }
                            : candidate,
                        ),
                      { revalidate: false },
                    );
                  }}
                />
              </div>
            ))}
          </div>
          <nav
            aria-label="下部のクイズ移動"
            className="fixed inset-x-0 bottom-[var(--app-footer-height,5rem)] z-30 flex items-center justify-between gap-3 border-t bg-background px-3 py-2 sm:hidden"
            data-dashboard-swipe-ignore
          >
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              disabled={currentIndex === 0}
              onClick={() => moveFromBottom(currentIndex - 1)}
            >
              <ChevronLeft aria-hidden="true" /> 前の問題
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              disabled={currentIndex === sorted.length - 1}
              onClick={() => moveFromBottom(currentIndex + 1)}
            >
              次の問題 <ChevronRight aria-hidden="true" />
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}

function QuizTimelinePager({
  currentIndex,
  quizIds,
  completedIds,
  onChange,
}: {
  currentIndex: number;
  quizIds: string[];
  completedIds: Set<string>;
  onChange: (index: number) => void;
}) {
  const count = quizIds.length;
  const dotsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = dotsRef.current;
    const selected =
      container?.querySelectorAll<HTMLElement>("button")[currentIndex];
    if (!container || !selected) return;
    const bounds = container.getBoundingClientRect();
    const dot = selected.getBoundingClientRect();
    if (dot.left < bounds.left || dot.right > bounds.right) {
      container.scrollTo?.({
        left:
          container.scrollLeft +
          dot.left -
          bounds.left -
          (bounds.width - dot.width) / 2,
        behavior: "smooth",
      });
    }
  }, [currentIndex]);
  return (
    <nav
      className="border-b"
      aria-label="クイズを移動"
      data-dashboard-swipe-ignore
    >
      <div className="flex items-center gap-2 px-2 py-0.5 sm:px-4 sm:py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-quiz-timeline-prev
          disabled={currentIndex === 0}
          onClick={() => onChange(currentIndex - 1)}
          aria-label="前のクイズ"
        >
          <ChevronLeft />
        </Button>
        <div ref={dotsRef} className="min-w-0 flex-1 overflow-x-auto py-1">
          <div className="mx-auto flex w-max items-center gap-0.5">
            {quizIds.map((quizId, index) => (
              <button
                key={quizId}
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded-full"
                onClick={() => onChange(index)}
                aria-label={`${index + 1}問目を表示`}
                title={completedIds.has(quizId) ? "回答済み" : "未回答"}
                aria-current={index === currentIndex ? "true" : undefined}
              >
                <span
                  className={cn(
                    "block size-2 rounded-full transition-[width,height,background-color]",
                    completedIds.has(quizId)
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/35",
                    index === currentIndex &&
                      "size-2.5 ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {currentIndex + 1} / {count}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-quiz-timeline-next
          disabled={currentIndex === count - 1}
          onClick={() => onChange(currentIndex + 1)}
          aria-label="次のクイズ"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}

function QuizTimelineCard({
  item,
  isCurrent,
  sessionResult,
  hasSessionResult,
  onAnswered,
}: {
  item: ManagedQuiz;
  isCurrent: boolean;
  sessionResult?: boolean;
  hasSessionResult: boolean;
  onAnswered: (isCorrect: boolean) => void;
}) {
  return (
    <Card
      className="gap-0 border-0 py-0 shadow-none"
      data-quiz-timeline-card
      data-quiz-open="true"
    >
      <div
        data-hotkey-item={isCurrent ? true : undefined}
        data-hotkey-active={isCurrent ? "true" : undefined}
        className="border-b p-3 outline-none data-[hotkey-active=true]:bg-accent/30 sm:p-4"
      >
        <QuizPreviewPrompt
          quiz={item.quiz}
          className="min-w-0 flex-1"
          headerAccessory={
            hasSessionResult ? (
              <Badge variant={sessionResult ? "secondary" : "destructive"}>
                今回 {sessionResult ? "正解" : "不正解"}
              </Badge>
            ) : (
              <Badge
                variant={
                  item.attempts === 0
                    ? "default"
                    : needsReview(item)
                      ? "destructive"
                      : "secondary"
                }
              >
                {item.answered_in_set || item.answered_today
                  ? "回答済み"
                  : item.attempts === 0
                    ? "未回答"
                    : needsReview(item)
                      ? `復習 ${Math.round((item.accuracy ?? 0) * 100)}%`
                      : `${item.attempts}回答`}
              </Badge>
            )
          }
        />
      </div>
      <CardContent className="space-y-2 p-0">
        <QuizAttempt
          key={item.quiz.quiz_id}
          quiz={item.quiz}
          showStatement={false}
          compactMobile
          className="border-0 p-3 sm:p-4"
          onAnswered={onAnswered}
          completed={item.answered_in_set || item.answered_today}
          actionInfo={
            item.accuracy != null ? (
              <span className="whitespace-nowrap">
                正答率 {Math.round(item.accuracy * 100)}%
              </span>
            ) : undefined
          }
        />
      </CardContent>
    </Card>
  );
}

function needsReview(item: ManagedQuiz): boolean {
  return (
    item.attempts > 0 &&
    item.accuracy !== null &&
    item.accuracy < REVIEW_ACCURACY_THRESHOLD
  );
}
