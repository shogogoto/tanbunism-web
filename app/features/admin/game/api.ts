import { API_BASE_URL, requestJson } from "~/shared/lib/requestJson";

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

export function listAdminGameDungeons(): Promise<AdminGameDungeon[]> {
  return request("/admin/game/dungeons");
}

export function alignAdminDungeonRegions(
  userId: string,
  resourceId: string,
): Promise<{
  changed: boolean;
  region_count: number;
  place_count: number;
}> {
  return request(
    `/admin/users/${encodeURIComponent(userId)}/game/dungeons/${encodeURIComponent(resourceId)}/regions/align`,
    { method: "POST" },
  );
}

export function rebuildAdminDungeonEnemies(
  userId: string,
  resourceId: string,
  reroll = true,
): Promise<EnemyPoolRebuildResult> {
  return request(
    `/admin/users/${encodeURIComponent(userId)}/game/dungeons/${encodeURIComponent(resourceId)}/enemies/rebuild?reroll=${reroll}`,
    { method: "POST" },
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(`${API_BASE_URL}${path}`, init, {
    errorMessage: "ダンジョン情報を取得できませんでした。",
  });
}
