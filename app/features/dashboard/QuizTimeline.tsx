import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPrompt from "~/features/quiz/QuizPrompt";
import { type ManagedQuiz, searchCreatedQuizzes } from "~/features/quiz/api";
import { Badge } from "~/shared/components/ui/badge";
import { Card, CardContent } from "~/shared/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/shared/components/ui/collapsible";
import { cn } from "~/shared/lib/utils";

export default function QuizTimeline() {
  const [quizzes, setQuizzes] = useState<ManagedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [sessionResults, setSessionResults] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    let active = true;
    searchCreatedQuizzes({ page: 1, size: 50 })
      .then((result) => {
        if (active) setQuizzes(result.data);
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "クイズTLを取得できませんでした。",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const sorted = useMemo(
    () => [...quizzes].sort(compareQuizTimeline).slice(0, 20),
    [quizzes],
  );

  if (loading) {
    return (
      <p className="p-4 text-sm text-muted-foreground">クイズTLを読み込み中…</p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-2">
      {error && (
        <p
          role="alert"
          className="border border-destructive/50 p-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {sorted.length === 0 && !error && (
        <p className="border p-2 text-sm text-muted-foreground">
          学習計画でクイズを準備すると、ここに表示されます。
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
                <Badge variant={item.attempts === 0 ? "default" : "secondary"}>
                  {item.attempts === 0 ? "未回答" : `${item.attempts}回答`}
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
  const leftDate = left.last_attempted_at ?? left.quiz.created;
  const rightDate = right.last_attempted_at ?? right.quiz.created;
  return String(rightDate).localeCompare(String(leftDate));
}
