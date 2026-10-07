import useSWR from "swr";
import { useAuth } from "~/features/auth/AuthProvider";

export type ReviewSettings = {
  id: string;
  name: string;
  resource_ids: string[] | null;
  tanbun_count: number;
  quiz_count: number;
  priority: "balanced" | "unseen" | "weak" | "score" | "pagerank";
};
export const reviewPriorities = {
  balanced: "バランス",
  unseen: "未閲覧・未回答",
  weak: "苦手・久しぶり",
  score: "高スコア",
  pagerank: "PageRank（知識）",
};
export const defaultSettings: ReviewSettings = {
  id: "default",
  name: "標準",
  resource_ids: null,
  tanbun_count: 30,
  quiz_count: 20,
  priority: "balanced",
};
const api = import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export async function settingsRequest<T>(
  path = "",
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${api}/review/settings${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "復習設定を保存・取得できませんでした。",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export function useReviewSettings() {
  const { user, isAuthenticated } = useAuth();
  return useSWR<ReviewSettings[]>(
    isAuthenticated && user ? ["review-settings", user.uid] : null,
    () => settingsRequest<ReviewSettings[]>(),
    { dedupingInterval: 30_000 },
  );
}

export function presetStorageKey(userId?: string) {
  return `review-preset:${userId ?? "anonymous"}`;
}
