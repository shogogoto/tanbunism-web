import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyQuizAchievement } from "./api";

export default function QuizAchievementChart({
  achievement,
}: {
  achievement: MonthlyQuizAchievement;
}) {
  const data = achievement.days.map((day) => ({
    ...day,
    day: Number(day.date.slice(-2)),
    n_quiz_created: day.n_quiz_created ?? 0,
    n_quiz_answered: day.n_quiz_answered ?? 0,
    n_quiz_correct: day.n_quiz_correct ?? 0,
  }));

  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label={`${achievement.year}年${achievement.month}月の日別クイズ作業数`}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={1}
        initialDimension={{ width: 800, height: 288 }}
      >
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickLine={false} />
          <YAxis allowDecimals={false} tickLine={false} />
          <Tooltip labelFormatter={(day) => `${achievement.month}月${day}日`} />
          <Legend />
          <Bar
            dataKey="n_quiz_created"
            name="クイズ作成"
            stackId="work"
            fill="var(--color-chart-2, #60a5fa)"
          />
          <Bar
            dataKey="n_quiz_answered"
            name="クイズ回答"
            stackId="work"
            fill="var(--color-chart-1, #22c55e)"
            radius={[3, 3, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="n_quiz_correct"
            name="正解"
            stroke="var(--color-chart-3, #f59e0b)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
