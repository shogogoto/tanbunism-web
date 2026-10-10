export type AdminGameDungeon = {
  user_id: string;
  user_email: string;
  resource_id: string;
  resource_name: string;
  status: string;
  region_count: number;
  quiz_count: number;
  regions: {
    level: number;
    quizzes: {
      quiz_id: string;
      quiz_type: string;
      statement: string;
    }[];
  }[];
};

export type EnemyPoolRebuildResult = {
  dungeon_count: number;
  region_count: number;
  quiz_count: number;
  preparing?: boolean;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export function listAdminGameDungeons(): Promise<AdminGameDungeon[]> {
  return request("/admin/game/dungeons");
}

export function rebuildAdminDungeonEnemies(
  userId: string,
  resourceId: string,
): Promise<EnemyPoolRebuildResult> {
  return request(
    `/admin/users/${encodeURIComponent(userId)}/game/dungeons/${encodeURIComponent(resourceId)}/enemies/rebuild`,
    { method: "POST" },
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
  });
  if (response.ok) return (await response.json()) as T;
  const body = (await response.json().catch(() => undefined)) as
    | { detail?: string }
    | undefined;
  throw new Error(
    typeof body?.detail === "string"
      ? body.detail
      : "ダンジョン情報を取得できませんでした。",
  );
}
