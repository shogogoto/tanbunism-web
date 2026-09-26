import { genericCache } from "~/shared/lib/indexed";
import { getItem } from "~/shared/lib/storage";

type QuizCacheArea =
  | "answer-history"
  | "created-list"
  | "created-resources"
  | "created-search"
  | "created-sentences"
  | "learning-progress"
  | "quiz-chain"
  | "study-plans";

export const quizCacheTtl = {
  short: 60_000,
  medium: 5 * 60_000,
  long: 24 * 60 * 60_000,
} as const;

const CACHE_PREFIX = "private:quiz:v1";

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
  ttl: number,
  load: () => Promise<T>,
): Promise<T> {
  const userId = currentUserId();
  if (!userId) return load();

  const key = cacheKey(userId, area, identity);
  try {
    const cached = (await genericCache.get(key)) as T | undefined;
    if (cached !== undefined) return cached;
  } catch {
    // IndexedDBが利用できない環境でもAPI取得は継続する。
  }

  const fresh = await load();
  await genericCache.set(key, fresh, ttl).catch(() => undefined);
  return fresh;
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
