const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

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
): Promise<TanbunExposureResult> {
  return request<TanbunExposureResult>(
    `/dashboard/tanbuns/${encodeURIComponent(sentenceId)}/exposures`,
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
  throw Object.assign(
    new Error(body?.detail ?? "ダッシュボードを取得できませんでした。"),
    { status: response.status },
  );
}
