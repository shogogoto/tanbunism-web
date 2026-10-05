import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPrompt from "~/features/quiz/QuizPrompt";
import { type ManagedQuiz, listDailyQuizzes } from "~/features/quiz/api";
import { useQuizSWR } from "~/features/quiz/useQuizSWR";
import Loading from "~/shared/components/Loading";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";
import { useRecommendationDay } from "~/shared/lib/recommendationDay";
import { cn } from "~/shared/lib/utils";

const REVIEW_ACCURACY_THRESHOLD = 0.8;

export default function QuizTimeline({
  scope = "personal",
}: {
  scope?: "personal" | "global";
}) {
  const day = useRecommendationDay();
  return <DailyQuizTimeline key={`${scope}:${day}`} scope={scope} day={day} />;
}

function DailyQuizTimeline({
  scope,
  day,
}: {
  scope: "personal" | "global";
  day: string;
}) {
  const [sessionResults, setSessionResults] = useState<Record<string, boolean>>(
    {},
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const {
    data: quizzes = [],
    error,
    isLoading,
    mutate,
  } = useQuizSWR<ManagedQuiz[]>(
    ["daily-quiz-timeline", scope, day],
    async (cacheOptions) => {
      return (await listDailyQuizzes(scope === "personal", cacheOptions)).data;
    },
    {
      dedupingInterval: 30_000,
      keepPreviousData: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const sorted = quizzes;
  const completed = sorted.filter(
    (item) => item.answered_today || item.quiz.quiz_id in sessionResults,
  ).length;

  useEffect(() => {
    setCurrentIndex((current) =>
      Math.min(current, Math.max(0, sorted.length - 1)),
    );
  }, [sorted.length]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-2" data-quiz-timeline>
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
      {sorted.length === 0 && !error && (
        <p className="border p-2 text-sm text-muted-foreground">
          {scope === "global"
            ? "回答できるクイズはまだありません。"
            : "学習計画でクイズを準備すると、ここに表示されます。"}
        </p>
      )}
      {sorted.length > 0 && (
        <div className="border-y sm:border-x">
          <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
            <span>今日のおすすめ</span>
            <span className="tabular-nums text-muted-foreground">
              {completed} / {sorted.length}問 回答済み
            </span>
          </div>
          <QuizTimelinePager
            currentIndex={currentIndex}
            quizIds={sorted.map((item) => item.quiz.quiz_id)}
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
        </div>
      )}
    </div>
  );
}

function QuizTimelinePager({
  currentIndex,
  quizIds,
  onChange,
}: {
  currentIndex: number;
  quizIds: string[];
  onChange: (index: number) => void;
}) {
  const count = quizIds.length;
  return (
    <nav
      className="flex items-center gap-2 border-b px-2 py-3 sm:px-4"
      aria-label="クイズを移動"
      data-dashboard-swipe-ignore
    >
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
      <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto py-1">
        {quizIds.map((quizId, index) => (
          <button
            key={quizId}
            type="button"
            className="flex size-7 shrink-0 items-center justify-center rounded-full"
            onClick={() => onChange(index)}
            aria-label={`${index + 1}問目を表示`}
            aria-current={index === currentIndex ? "true" : undefined}
          >
            <span
              className={cn(
                "block size-1.5 rounded-full bg-muted-foreground/35 transition-[width,height,background-color]",
                index === currentIndex && "size-2.5 bg-primary",
              )}
              aria-hidden="true"
            />
          </button>
        ))}
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
        className="flex items-start gap-3 border-b p-4 outline-none data-[hotkey-active=true]:bg-accent/30"
      >
        <QuizPrompt quiz={item.quiz} className="min-w-0 flex-1" />
        {hasSessionResult ? (
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
            {item.attempts === 0
              ? "未回答"
              : needsReview(item)
                ? `復習 ${Math.round((item.accuracy ?? 0) * 100)}%`
                : `${item.attempts}回答`}
          </Badge>
        )}
      </div>
      <CardContent className="space-y-2 p-0">
        <QuizAttempt
          key={item.quiz.quiz_id}
          quiz={item.quiz}
          showStatement={false}
          className="border-0 p-4"
          onAnswered={onAnswered}
        />
        {item.accuracy !== null && (
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">
            これまでの正答率 {Math.round(item.accuracy * 100)}%
          </p>
        )}
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
