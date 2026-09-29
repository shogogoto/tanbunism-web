const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export type AdminBrokenQuiz = {
  quiz_id: string;
  quiz_type: "term2sent" | "sent2term" | "rel2pair" | "pair2rel";
  owner_email: string | null;
  broken_reference_count: number;
  answer_count: number;
  created: string;
};

export type DeleteBrokenQuizzesResult = {
  deleted_count: number;
  deleted_answer_count: number;
};

export function listAdminBrokenQuizzes(): Promise<AdminBrokenQuiz[]> {
  return request("/admin/broken-quizzes");
}

export function deleteAdminBrokenQuizzes(
  quizIds: string[],
): Promise<DeleteBrokenQuizzesResult> {
  return request("/admin/broken-quizzes/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quiz_ids: quizIds }),
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
  throw new Error(body?.detail ?? "参照切れクイズを操作できませんでした。");
}
