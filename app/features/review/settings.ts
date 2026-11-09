import useSWR from "swr";
import { useAuth } from "~/features/auth/AuthProvider";
import { API_BASE_URL, requestJson } from "~/shared/lib/requestJson";

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
  name: "今日",
  resource_ids: null,
  tanbun_count: 30,
  quiz_count: 20,
  priority: "balanced",
};

export async function settingsRequest<T>(
  path = "",
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  return requestJson<T>(
    `${API_BASE_URL}/review/settings${path}`,
    {
      ...init,
      headers,
    },
    {
      errorMessage: "復習設定を保存・取得できませんでした。",
    },
  );
}

export function useReviewSettings() {
  const { user, isAuthenticated } = useAuth();
  return useSWR<ReviewSettings[]>(
    isAuthenticated && user ? ["review-settings", user.uid] : null,
    async () =>
      (await settingsRequest<ReviewSettings[]>()).map((setting) =>
        setting.id === "default" && setting.name === "標準"
          ? { ...setting, name: "今日" }
          : setting,
      ),
    { dedupingInterval: 30_000 },
  );
}

export function presetStorageKey(userId?: string) {
  return `review-preset:${userId ?? "anonymous"}`;
}
