import type { MonthlyQuizAchievement } from "./api";

export function monthlyQuizAchievementFixture(
  year = 2026,
  month = 8,
): MonthlyQuizAchievement {
  const nDays = new Date(year, month, 0).getDate();
  const days = Array.from({ length: nDays }, (_, index) => {
    const day = index + 1;
    const active = day === 1 || day === 3 || day === 8;
    const nQuizCreated = active ? (day === 3 ? 2 : 1) : 0;
    const nQuizAnswered = active ? day : 0;
    return {
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      n_quiz_created: nQuizCreated,
      n_quiz_answered: nQuizAnswered,
      n_quiz_correct: active ? Math.max(0, nQuizAnswered - 1) : 0,
      n_work: nQuizCreated + nQuizAnswered,
    };
  });
  const nQuizCreated = days.reduce(
    (sum, day) => sum + (day.n_quiz_created ?? 0),
    0,
  );
  const nQuizAnswered = days.reduce(
    (sum, day) => sum + (day.n_quiz_answered ?? 0),
    0,
  );
  const nQuizCorrect = days.reduce(
    (sum, day) => sum + (day.n_quiz_correct ?? 0),
    0,
  );
  return {
    year,
    month,
    days,
    total: {
      n_quiz_created: nQuizCreated,
      n_quiz_answered: nQuizAnswered,
      n_quiz_correct: nQuizCorrect,
      n_work: nQuizCreated + nQuizAnswered,
    },
  };
}
