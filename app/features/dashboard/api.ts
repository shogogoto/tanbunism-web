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
};

export type TanbunExposureResult = {
  sentence_id: string;
  seen_on: string;
  exposure_count: number;
  recorded: boolean;
};

export async function listPersonalTanbuns(): Promise<PersonalTanbunItem[]> {
  return request<PersonalTanbunItem[]>("/dashboard/tanbuns");
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
  throw new Error(body?.detail ?? "ダッシュボードを取得できませんでした。");
}
