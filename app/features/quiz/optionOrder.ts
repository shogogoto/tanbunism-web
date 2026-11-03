import { useMemo } from "react";
import type { ReadableQuiz } from "./api";

/** Fisher–Yates keeps answer IDs unchanged, including numeric-looking IDs. */
export function shuffleOptionIds(
  ids: string[],
  random = Math.random,
): string[] {
  const result = [...ids];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** One order per mounted attempt, stable across timers, selection and feedback. */
export function useQuizOptionOrder(quiz: ReadableQuiz): string[] {
  const signature = JSON.stringify([
    quiz.quiz_id,
    Object.keys(quiz.options).sort(),
  ]);
  return useMemo(() => {
    const [, ids] = JSON.parse(signature) as [string, string[]];
    return shuffleOptionIds(ids);
  }, [signature]);
}
