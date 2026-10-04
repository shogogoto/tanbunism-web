import { beforeEach, expect, it, vi } from "vitest";
import { genericCache } from "~/shared/lib/indexed";
import { setItem } from "~/shared/lib/storage";
import {
  clearAllQuizCache,
  invalidateQuizCache,
  quizCachePolicy,
  withQuizCache,
} from "./cache";

beforeEach(async () => {
  localStorage.clear();
  vi.restoreAllMocks();
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
    quizCachePolicy.normal,
    load,
  );
  const second = await withQuizCache(
    "created-search",
    { page: 1, resource_id: "resource-1" },
    quizCachePolicy.normal,
    load,
  );

  expect(first).toEqual(second);
  expect(load).toHaveBeenCalledTimes(1);
});

it("古い値を即座に返してバックグラウンドで更新する", async () => {
  authenticate("user-1");
  let now = 1_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const load = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("cached")
    .mockResolvedValueOnce("fresh");
  const policy = { refreshAfter: 100, expireAfter: 10_000 };

  expect(await withQuizCache("created-search", {}, policy, load)).toBe(
    "cached",
  );
  now += 101;
  expect(await withQuizCache("created-search", {}, policy, load)).toBe(
    "cached",
  );
  await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  await vi.waitFor(async () =>
    expect(await withQuizCache("created-search", {}, policy, load)).toBe(
      "fresh",
    ),
  );
});

it("SWRからの再検証では古い値を表示したまま最新値を待てる", async () => {
  authenticate("user-1");
  let now = 1_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const load = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("cached")
    .mockResolvedValueOnce("fresh");
  const policy = { refreshAfter: 100, expireAfter: 10_000 };

  await withQuizCache("created-search", {}, policy, load);
  now += 101;

  expect(
    await withQuizCache("created-search", {}, policy, load, {
      waitForRefresh: true,
    }),
  ).toBe("fresh");
  expect(load).toHaveBeenCalledTimes(2);
});

it("バックグラウンド処理の完了後は期限内の値も強制更新できる", async () => {
  authenticate("user-1");
  const load = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("cached")
    .mockResolvedValueOnce("fresh");

  await withQuizCache(
    "study-plan-preparations",
    {},
    quizCachePolicy.normal,
    load,
  );

  expect(
    await withQuizCache(
      "study-plan-preparations",
      {},
      quizCachePolicy.normal,
      load,
      { forceRefresh: true },
    ),
  ).toBe("fresh");
  expect(load).toHaveBeenCalledTimes(2);
});

it("ユーザーを跨いでクイズキャッシュを共有しない", async () => {
  const load = vi
    .fn()
    .mockResolvedValueOnce("user-1")
    .mockResolvedValueOnce("user-2");

  authenticate("user-1");
  expect(
    await withQuizCache("answer-history", {}, quizCachePolicy.live, load),
  ).toBe("user-1");

  authenticate("user-2");
  expect(
    await withQuizCache("answer-history", {}, quizCachePolicy.live, load),
  ).toBe("user-2");
  expect(load).toHaveBeenCalledTimes(2);
});

it("回答後に関連するキャッシュだけを無効化できる", async () => {
  authenticate("user-1");
  const loadAnswers = vi.fn().mockResolvedValue("answers");
  const loadPlans = vi.fn().mockResolvedValue("plans");

  await withQuizCache("answer-history", {}, quizCachePolicy.live, loadAnswers);
  await withQuizCache("study-plans", {}, quizCachePolicy.normal, loadPlans);
  await invalidateQuizCache("answer-history");
  await withQuizCache("answer-history", {}, quizCachePolicy.live, loadAnswers);
  await withQuizCache("study-plans", {}, quizCachePolicy.normal, loadPlans);

  expect(loadAnswers).toHaveBeenCalledTimes(2);
  expect(loadPlans).toHaveBeenCalledTimes(1);
});

it("ログアウト用に全ユーザーのクイズキャッシュを消去する", async () => {
  const load = vi.fn().mockResolvedValue("value");
  authenticate("user-1");
  await withQuizCache("quiz-chain", "quiz-1", quizCachePolicy.stable, load);
  authenticate("user-2");
  await withQuizCache("quiz-chain", "quiz-1", quizCachePolicy.stable, load);

  await clearAllQuizCache();

  expect(await genericCache.count()).toBe(0);
});
