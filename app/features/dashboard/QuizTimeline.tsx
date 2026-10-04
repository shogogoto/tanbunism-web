import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Card, CardContent } from "~/shared/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/shared/components/ui/collapsible";
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

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-2">
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
        <div className="divide-y border-y sm:border-x">
          {sorted.map((item) => (
            <QuizTimelineCard
              key={item.quiz.quiz_id}
              item={item}
              sessionResult={sessionResults[item.quiz.quiz_id]}
              hasSessionResult={item.quiz.quiz_id in sessionResults}
              onAnswered={(isCorrect) =>
                setSessionResults((current) => ({
                  ...current,
                  [item.quiz.quiz_id]: isCorrect,
                }))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuizTimelineCard({
  item,
  sessionResult,
  hasSessionResult,
  onAnswered,
}: {
  item: ManagedQuiz;
  sessionResult?: boolean;
  hasSessionResult: boolean;
  onAnswered: (isCorrect: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      data-quiz-timeline-card
      data-quiz-open={isOpen}
    >
      <Card className="gap-0 py-0 shadow-none">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            data-hotkey-item
            className="flex w-full items-center gap-2 p-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[hotkey-active=true]:bg-accent/60 data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-inset data-[hotkey-active=true]:ring-primary"
          >
            <QuizPrompt quiz={item.quiz} compact className="min-w-0 flex-1" />
            <span className="flex shrink-0 items-center gap-2">
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
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  isOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2 border-t p-0">
            <QuizAttempt
              quiz={item.quiz}
              showStatement={false}
              className="border-0"
              onAnswered={onAnswered}
            />
            {item.accuracy !== null && (
              <p className="border-t px-2 py-2 text-xs text-muted-foreground">
                これまでの正答率 {Math.round(item.accuracy * 100)}%
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
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
