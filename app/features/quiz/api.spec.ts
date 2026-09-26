import { beforeEach, expect, it, vi } from "vitest";
import { genericCache } from "~/shared/lib/indexed";
import { setItem } from "~/shared/lib/storage";

const generated = vi.hoisted(() => ({
  answerQuiz: vi.fn(),
  listAnswerHistory: vi.fn(),
}));

vi.mock("./generated/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./generated/api")>()),
  answerQuizApiQuizAnswerQuizIdPost: generated.answerQuiz,
  listAnswerHistoryApiQuizAnswersGet: generated.listAnswerHistory,
}));

import { answerQuiz, listAnswerHistory } from "./api";

beforeEach(async () => {
  localStorage.clear();
  setItem("auth-user", { status: 200, data: { uid: "user-1" } });
  await genericCache.clear();
  generated.answerQuiz.mockReset();
  generated.listAnswerHistory.mockReset();
});

it("回答履歴を再利用し、新しい回答後には取得し直す", async () => {
  const history = { data: [], total: 0 };
  generated.listAnswerHistory.mockResolvedValue({
    data: history,
    status: 200,
  });
  generated.answerQuiz.mockResolvedValue({
    data: { sentences: [], quizzes: [], links: [], answers: [] },
    status: 200,
  });

  await listAnswerHistory({ page: 1, size: 5 });
  await listAnswerHistory({ size: 5, page: 1 });
  expect(generated.listAnswerHistory).toHaveBeenCalledTimes(1);

  await answerQuiz("quiz-1", ["sentence-1"]);
  await listAnswerHistory({ page: 1, size: 5 });

  expect(generated.listAnswerHistory).toHaveBeenCalledTimes(2);
});
