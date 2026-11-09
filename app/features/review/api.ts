import { API_BASE_URL, requestJson } from "~/shared/lib/requestJson";

export type PersonalTanbunItem = {
  uid: string;
  sentence: string;
  term_names: string[];
  resource_uid: string;
  resource_name: string;
  updated_at: string | null;
  score?: number;
  exposure_count: number;
  seen_today: boolean;
  seen_in_set?: boolean;
};

export type TanbunExposureResult = {
  sentence_id: string;
  seen_on: string;
  exposure_count: number;
  recorded: boolean;
  step_recovery_awarded?: boolean;
};

export type TodayTanbunExposureCount = {
  seen_on: string;
  count: number;
};

export async function listPersonalTanbuns(
  profile = "default",
  day?: string,
): Promise<PersonalTanbunItem[]> {
  return request<PersonalTanbunItem[]>(
    `/dashboard/tanbuns?profile=${encodeURIComponent(profile)}${day ? `&day=${encodeURIComponent(day)}` : ""}`,
  );
}

export async function getTodayTanbunExposureCount(): Promise<TodayTanbunExposureCount> {
  return request<TodayTanbunExposureCount>(
    "/dashboard/tanbuns/exposures/today",
  );
}

export async function addPersonalTanbuns(
  profile: string,
): Promise<PersonalTanbunItem[]> {
  return request(
    `/dashboard/tanbuns/more?profile=${encodeURIComponent(profile)}`,
    { method: "POST" },
  );
}

export async function markTanbunSeen(
  sentenceId: string,
  deferGameReward = false,
): Promise<TanbunExposureResult> {
  return request<TanbunExposureResult>(
    `/dashboard/tanbuns/${encodeURIComponent(sentenceId)}/exposures${deferGameReward ? "?defer_game_reward=true" : ""}`,
    { method: "POST" },
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(`${API_BASE_URL}${path}`, init, {
    errorMessage: "ダッシュボードを取得できませんでした。",
  });
}
