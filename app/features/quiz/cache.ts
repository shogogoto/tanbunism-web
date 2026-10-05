import { genericCache } from "~/shared/lib/indexed";
import { getItem } from "~/shared/lib/storage";

type QuizCacheArea =
  | "answer-history"
  | "created-list"
  | "created-resources"
  | "created-search"
  | "created-sentences"
  | "learning-progress"
  | "quiz-feed"
  | "daily-quizzes"
  | "quiz-chain"
  | "study-resources"
  | "study-plan-preparations"
  | "study-plans";

type QuizCachePolicy = {
  refreshAfter: number;
  expireAfter: number;
};

export const quizCachePolicy = {
  live: {
    refreshAfter: 5 * 60_000,
    expireAfter: 24 * 60 * 60_000,
  },
  normal: {
    refreshAfter: 30 * 60_000,
    expireAfter: 7 * 24 * 60 * 60_000,
  },
  stable: {
    refreshAfter: 24 * 60 * 60_000,
    expireAfter: 30 * 24 * 60 * 60_000,
  },
} as const;

type QuizCacheEnvelope<T> = {
  kind: "quiz-cache-v2";
  value: T;
  updatedAt: number;
};

const CACHE_PREFIX = "private:quiz:v2";
const refreshes = new Map<string, Promise<unknown>>();

function currentUserId(): string | undefined {
  try {
    const cached = getItem("auth-user") as
      | { data?: { uid?: unknown } }
      | undefined;
    return typeof cached?.data?.uid === "string" ? cached.data.uid : undefined;
  } catch {
    return undefined;
  }
}

export function hasQuizCacheIdentity(): boolean {
  return currentUserId() !== undefined;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function areaPrefix(userId: string, area: QuizCacheArea) {
  return `${CACHE_PREFIX}:${userId}:${area}:`;
}

function cacheKey(userId: string, area: QuizCacheArea, identity: unknown) {
  return `${areaPrefix(userId, area)}${JSON.stringify(stableValue(identity))}`;
}

export async function withQuizCache<T>(
  area: QuizCacheArea,
  identity: unknown,
  policy: QuizCachePolicy,
  load: () => Promise<T>,
  {
    waitForRefresh = false,
    forceRefresh = false,
  }: { waitForRefresh?: boolean; forceRefresh?: boolean } = {},
): Promise<T> {
  const userId = currentUserId();
  if (!userId) return load();

  const key = cacheKey(userId, area, identity);
  const refresh = () => {
    const running = refreshes.get(key) as Promise<T> | undefined;
    if (running) return running;
    const promise = load()
      .then(async (value) => {
        const envelope: QuizCacheEnvelope<T> = {
          kind: "quiz-cache-v2",
          value,
          updatedAt: Date.now(),
        };
        await genericCache
          .set(key, envelope, policy.expireAfter)
          .catch(() => undefined);
        return value;
      })
      .finally(() => refreshes.delete(key));
    refreshes.set(key, promise);
    return promise;
  };

  if (forceRefresh) return refresh();

  try {
    const cached = (await genericCache.get(key)) as
      | QuizCacheEnvelope<T>
      | undefined;
    if (cached?.kind === "quiz-cache-v2") {
      if (Date.now() - cached.updatedAt >= policy.refreshAfter) {
        const updating = refresh();
        if (waitForRefresh) return updating;
        void updating.catch(() => undefined);
      }
      return cached.value;
    }
  } catch {
    // IndexedDBが利用できない環境でもAPI取得は継続する。
  }

  return refresh();
}

export async function invalidateQuizCache(
  ...areas: QuizCacheArea[]
): Promise<void> {
  const userId = currentUserId();
  if (!userId) return;
  await Promise.all(
    areas.map((area) =>
      genericCache
        .deletePrefix(areaPrefix(userId, area))
        .catch(() => undefined),
    ),
  );
}

export function clearAllQuizCache(): Promise<number> {
  return genericCache.deletePrefix(`${CACHE_PREFIX}:`);
}
