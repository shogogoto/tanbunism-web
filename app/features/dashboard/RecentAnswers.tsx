import { useEffect, useState } from "react";
import { Link } from "react-router";
import { type AnswerHistoryItem, listAnswerHistory } from "~/features/quiz/api";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";

export default function RecentAnswers() {
  const [answers, setAnswers] = useState<AnswerHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    listAnswerHistory({ page: 1, size: 5 })
      .then(({ data }) => {
        if (active) setAnswers(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>最近の回答</CardTitle>
          <CardDescription>
            間違えた問題から復習を再開できます。
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/answers">すべて見る</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        )}
        {error && (
          <p className="text-sm text-muted-foreground">
            回答履歴を取得できませんでした。
          </p>
        )}
        {!isLoading && !error && answers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            まだ回答履歴がありません。
          </p>
        )}
        <div className="divide-y">
          {answers.map(({ answer, quiz }) => (
            <Link
              key={answer.answer_uid}
              to="/answers"
              className="flex items-start gap-3 py-3 hover:bg-muted/50"
            >
              <Badge
                className="mt-0.5 shrink-0"
                variant={answer.is_correct ? "secondary" : "destructive"}
              >
                {answer.is_correct ? "正解" : "不正解"}
              </Badge>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm">
                  {quiz.statement}
                </span>
                <time className="text-xs text-muted-foreground">
                  {new Date(answer.created).toLocaleString("ja-JP")}
                </time>
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
