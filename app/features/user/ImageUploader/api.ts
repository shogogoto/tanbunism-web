import { API_BASE_URL, requestJson } from "~/shared/lib/requestJson";

export async function imageRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  return requestJson<T>(`${API_BASE_URL}${path}`, init, {
    errorMessage: "画像の操作に失敗しました。再試行してください。",
  });
}
