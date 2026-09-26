import { beforeEach, expect, it, vi } from "vitest";
import { genericCache } from "~/shared/lib/indexed";
import { setItem } from "~/shared/lib/storage";
import {
  clearAllQuizCache,
  invalidateQuizCache,
  quizCacheTtl,
  withQuizCache,
} from "./cache";

beforeEach(async () => {
  localStorage.clear();
  await genericCache.clear();
});

function authenticate(uid: string) {
  setItem("auth-user", { status: 200, data: { uid } });
}

it("同じユーザーと条件のクイズ取得を再利用する", async () => {
  authenticate("user-1");
  const load = vi.fn().mockResolvedValue({ data: ["quiz-1"] });

  const first = await withQuizCache(
    "created-search",
    { resource_id: "resource-1", page: 1 },
    quizCacheTtl.medium,
    load,
  );
  const second = await withQuizCache(
    "created-search",
    { page: 1, resource_id: "resource-1" },
    quizCacheTtl.medium,
    load,
  );

  expect(first).toEqual(second);
  expect(load).toHaveBeenCalledTimes(1);
});

it("ユーザーを跨いでクイズキャッシュを共有しない", async () => {
  const load = vi
    .fn()
    .mockResolvedValueOnce("user-1")
    .mockResolvedValueOnce("user-2");

  authenticate("user-1");
  expect(
    await withQuizCache("answer-history", {}, quizCacheTtl.short, load),
  ).toBe("user-1");

  authenticate("user-2");
  expect(
    await withQuizCache("answer-history", {}, quizCacheTtl.short, load),
  ).toBe("user-2");
  expect(load).toHaveBeenCalledTimes(2);
});

it("回答後に関連するキャッシュだけを無効化できる", async () => {
  authenticate("user-1");
  const loadAnswers = vi.fn().mockResolvedValue("answers");
  const loadPlans = vi.fn().mockResolvedValue("plans");

  await withQuizCache("answer-history", {}, quizCacheTtl.short, loadAnswers);
  await withQuizCache("study-plans", {}, quizCacheTtl.medium, loadPlans);
  await invalidateQuizCache("answer-history");
  await withQuizCache("answer-history", {}, quizCacheTtl.short, loadAnswers);
  await withQuizCache("study-plans", {}, quizCacheTtl.medium, loadPlans);

  expect(loadAnswers).toHaveBeenCalledTimes(2);
  expect(loadPlans).toHaveBeenCalledTimes(1);
});

it("ログアウト用に全ユーザーのクイズキャッシュを消去する", async () => {
  const load = vi.fn().mockResolvedValue("value");
  authenticate("user-1");
  await withQuizCache("quiz-chain", "quiz-1", quizCacheTtl.long, load);
  authenticate("user-2");
  await withQuizCache("quiz-chain", "quiz-1", quizCacheTtl.long, load);

  await clearAllQuizCache();

  expect(await genericCache.count()).toBe(0);
});
