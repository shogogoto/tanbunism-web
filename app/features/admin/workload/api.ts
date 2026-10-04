const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export type QuizPreparationSettings = {
  max_concurrent_jobs: number;
  max_concurrent_jobs_per_user: number;
  max_quizzes_per_job: number;
};

export type ResourceImportSettings = {
  max_concurrent_imports: number;
  max_concurrent_imports_per_user: number;
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

export function getResourceImportSettings() {
  return request<ResourceImportSettings>("/admin/settings/resource-import");
}

export function updateResourceImportSettings(settings: ResourceImportSettings) {
  return request<ResourceImportSettings>("/admin/settings/resource-import", {
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
  throw new Error(body?.detail ?? "負荷制御の設定を操作できませんでした。");
}
