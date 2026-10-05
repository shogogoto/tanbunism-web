import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPrompt from "~/features/quiz/QuizPrompt";
import {
  type ManagedQuiz,
  type QuizType,
  listQuizFeed,
  searchCreatedQuizzes,
} from "~/features/quiz/api";
import { useQuizSWR } from "~/features/quiz/useQuizSWR";
import Loading from "~/shared/components/Loading";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";
import { cn } from "~/shared/lib/utils";

const REVIEW_ACCURACY_THRESHOLD = 0.8;

export default function QuizTimeline({
  scope = "personal",
}: {
  scope?: "personal" | "global";
}) {
  const [sessionResults, setSessionResults] = useState<Record<string, boolean>>(
    {},
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const {
    data: quizzes = [],
    error,
    isLoading,
  } = useQuizSWR<ManagedQuiz[]>(
    scope === "global" ? "global-quiz-timeline" : "dashboard-quiz-timeline",
    async (cacheOptions) => {
      if (scope === "global") {
        return (await listQuizFeed(cacheOptions)).data;
      }
      const quizTypes: QuizType[] = [
        "term2sent",
        "sent2term",
        "rel2pair",
        "pair2rel",
      ];
      const results = await Promise.allSettled(
        quizTypes.map((quizType) =>
          searchCreatedQuizzes(
            {
              quiz_types: [quizType],
              page: 1,
              size: 20,
            },
            cacheOptions,
          ),
        ),
      );
      const loaded = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value.data : [],
      );
      if (results.every((result) => result.status === "rejected")) {
        const reason = results[0]?.reason;
        throw reason instanceof Error
          ? reason
          : new Error("クイズTLを取得できませんでした。");
      }
      return [
        ...new Map(loaded.map((item) => [item.quiz.quiz_id, item])).values(),
      ];
    },
    {
      dedupingInterval: 30_000,
      keepPreviousData: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );

  const sorted = useMemo(() => mixQuizTimeline(quizzes, 20), [quizzes]);

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
        <div className="flex min-h-[calc(100dvh-13rem)] flex-col border-y sm:min-h-[70vh] sm:border-x">
          <div className="min-h-0 flex-1">
            {sorted.map((item, index) => (
              <div
                key={item.quiz.quiz_id}
                className="h-full"
                hidden={index !== currentIndex}
              >
                <QuizTimelineCard
                  item={item}
                  isCurrent={index === currentIndex}
                  sessionResult={sessionResults[item.quiz.quiz_id]}
                  hasSessionResult={item.quiz.quiz_id in sessionResults}
                  onAnswered={(isCorrect) =>
                    setSessionResults((current) => ({
                      ...current,
                      [item.quiz.quiz_id]: isCorrect,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <QuizTimelinePager
            currentIndex={currentIndex}
            quizIds={sorted.map((item) => item.quiz.quiz_id)}
            onChange={setCurrentIndex}
          />
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
      className="flex shrink-0 items-center gap-2 border-t px-2 py-3 sm:px-4"
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
      className="h-full min-h-full gap-0 border-0 py-0 shadow-none"
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

function compareQuizTimeline(left: ManagedQuiz, right: ManagedQuiz): number {
  if (left.attempts === 0 && right.attempts > 0) return -1;
  if (left.attempts > 0 && right.attempts === 0) return 1;
  if (needsReview(left) && !needsReview(right)) return -1;
  if (!needsReview(left) && needsReview(right)) return 1;
  if (needsReview(left) && needsReview(right)) {
    const accuracyDifference = (left.accuracy ?? 0) - (right.accuracy ?? 0);
    if (accuracyDifference !== 0) return accuracyDifference;
  }
  const leftDate = left.last_attempted_at ?? left.quiz.created;
  const rightDate = right.last_attempted_at ?? right.quiz.created;
  return String(rightDate).localeCompare(String(leftDate));
}

function needsReview(item: ManagedQuiz): boolean {
  return (
    item.attempts > 0 &&
    item.accuracy !== null &&
    item.accuracy < REVIEW_ACCURACY_THRESHOLD
  );
}

function mixQuizTimeline(quizzes: ManagedQuiz[], limit: number): ManagedQuiz[] {
  const unanswered = quizzes
    .filter((item) => item.attempts === 0)
    .sort(compareQuizTimeline);
  const reviews = quizzes
    .filter((item) => item.attempts > 0)
    .sort(compareQuizTimeline);
  const mixed: ManagedQuiz[] = [];
  while (
    mixed.length < limit &&
    (unanswered.length > 0 || reviews.length > 0)
  ) {
    const first = unanswered.shift();
    const second = unanswered.shift();
    const review = reviews.shift();
    if (first) mixed.push(first);
    if (second && mixed.length < limit) mixed.push(second);
    if (review && mixed.length < limit) mixed.push(review);
  }
  return mixed;
}
