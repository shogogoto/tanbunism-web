import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  type MonthlyQuizAchievement,
  fetchMonthlyQuizAchievement,
} from "~/features/achievement/api";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";

export default function DashboardAchievement() {
  const [achievement, setAchievement] = useState<MonthlyQuizAchievement>();
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const now = new Date();
    fetchMonthlyQuizAchievement(
      now.getFullYear(),
      now.getMonth() + 1,
      controller.signal,
    )
      .then(setAchievement)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);

  const answered = achievement?.total.n_quiz_answered ?? 0;
  const correct = achievement?.total.n_quiz_correct ?? 0;
  const items = [
    ["クイズ作成", achievement?.total.n_quiz_created ?? 0],
    ["クイズ回答", answered],
    ["正解", correct],
    [
      "正答率",
      answered === 0 ? "—" : `${Math.round((correct / answered) * 100)}%`,
    ],
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>今月の学習</CardTitle>
          <CardDescription>クイズの作成と回答の記録</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/achievement">月間記録を見る</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-muted-foreground">
            学習記録を取得できませんでした。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {items.map(([label, value]) => (
              <div key={label} className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {achievement ? value : "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
