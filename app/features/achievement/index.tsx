import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "~/shared/components/ui/alert";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import QuizAchievementChart from "./QuizAchievementChart";
import {
  type MonthlyQuizAchievement,
  fetchMonthlyQuizAchievement,
} from "./api";

type YearMonth = { year: number; month: number };

function currentMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function moveMonth(value: YearMonth, amount: number): YearMonth {
  const date = new Date(value.year, value.month - 1 + amount, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function Summary({ achievement }: { achievement: MonthlyQuizAchievement }) {
  const answered = achievement.total.n_quiz_answered ?? 0;
  const correct = achievement.total.n_quiz_correct ?? 0;
  const accuracy =
    answered === 0 ? "—" : `${Math.round((correct / answered) * 100)}%`;
  const items = [
    ["作業", achievement.total.n_work],
    ["クイズ作成", achievement.total.n_quiz_created ?? 0],
    ["クイズ回答", answered],
    ["正解", correct],
    ["正答率", accuracy],
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="border p-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  );
}

export default function QuizAchievement({
  initialMonth = currentMonth(),
}: {
  initialMonth?: YearMonth;
}) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [achievement, setAchievement] = useState<MonthlyQuizAchievement>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setAchievement(undefined);
    setError(undefined);
    fetchMonthlyQuizAchievement(
      selectedMonth.year,
      selectedMonth.month,
      controller.signal,
    )
      .then(setAchievement)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "クイズの学習記録を取得できませんでした。",
          );
        }
      });
    return () => controller.abort();
  }, [selectedMonth]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">学習記録</h1>
        <p className="text-sm text-muted-foreground">
          クイズの作成と回答を、一件ずつ作業として記録します。
        </p>
      </header>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="前の月"
            onClick={() => setSelectedMonth((value) => moveMonth(value, -1))}
          >
            <ChevronLeft />
          </Button>
          <div className="text-center">
            <CardTitle>
              {selectedMonth.year}年{selectedMonth.month}月
            </CardTitle>
            <CardDescription>日別クイズ作業数</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="次の月"
            onClick={() => setSelectedMonth((value) => moveMonth(value, 1))}
          >
            <ChevronRight />
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {!achievement && !error && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              学習記録を読み込んでいます…
            </p>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {achievement && (
            <>
              <Summary achievement={achievement} />
              <QuizAchievementChart achievement={achievement} />
              {achievement.total.n_work === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  この月にはまだクイズの作業記録がありません。
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
