import { getMonthlyQuizAchievementUserAchievementQuizMonthlyGet } from "./generated/api";
import type { MonthlyQuizAchievement } from "./generated/models";

export type { MonthlyQuizAchievement };

export async function fetchMonthlyQuizAchievement(
  year: number,
  month: number,
  signal?: AbortSignal,
): Promise<MonthlyQuizAchievement> {
  const response = await getMonthlyQuizAchievementUserAchievementQuizMonthlyGet(
    { year, month },
    { credentials: "include", signal },
  );
  if (response.status !== 200) {
    throw new Error("クイズの学習記録を取得できませんでした。");
  }
  return response.data;
}
