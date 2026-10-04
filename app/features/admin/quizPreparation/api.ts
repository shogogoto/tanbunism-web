const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export type QuizPreparationSettings = {
  max_concurrent_jobs: number;
  max_concurrent_jobs_per_user: number;
  max_quizzes_per_job: number;
};

export function getQuizPreparationSettings() {
  return request<QuizPreparationSettings>("/admin/settings/quiz-preparation");
}

export function updateQuizPreparationSettings(
  settings: QuizPreparationSettings,
) {
  return request<QuizPreparationSettings>("/admin/settings/quiz-preparation", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
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
  throw new Error(body?.detail ?? "クイズ作成設定を操作できませんでした。");
}
