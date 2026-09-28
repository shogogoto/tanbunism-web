import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import { type ManagedQuiz, searchCreatedQuizzes } from "~/features/quiz/api";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";

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
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link to="/quiz">クイズを解く</Link>
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {sorted.length === 0 && !error && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          学習計画でクイズを準備すると、ここに表示されます。
        </p>
      )}
      {sorted.map((item) => (
        <Card key={item.quiz.quiz_id}>
          <CardContent className="space-y-2 p-0">
            <QuizAttempt
              quiz={item.quiz}
              className="border-0"
              onAnswered={(isCorrect) =>
                setSessionResults((current) => ({
                  ...current,
                  [item.quiz.quiz_id]: isCorrect,
                }))
              }
            />
            <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
              {item.quiz.quiz_id in sessionResults ? (
                <Badge
                  variant={
                    sessionResults[item.quiz.quiz_id]
                      ? "secondary"
                      : "destructive"
                  }
                >
                  今回 {sessionResults[item.quiz.quiz_id] ? "正解" : "不正解"}
                </Badge>
              ) : (
                <Badge variant={item.attempts === 0 ? "default" : "secondary"}>
                  {item.attempts === 0 ? "未回答" : `${item.attempts}回答`}
                </Badge>
              )}
              {item.accuracy !== null && (
                <span className="text-xs text-muted-foreground">
                  これまでの正答率 {Math.round(item.accuracy * 100)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function compareQuizTimeline(left: ManagedQuiz, right: ManagedQuiz): number {
  if (left.attempts === 0 && right.attempts > 0) return -1;
  if (left.attempts > 0 && right.attempts === 0) return 1;
  const leftDate = left.last_attempted_at ?? left.quiz.created;
  const rightDate = right.last_attempted_at ?? right.quiz.created;
  return String(rightDate).localeCompare(String(leftDate));
}
