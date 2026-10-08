const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export async function imageRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "画像の操作に失敗しました。再試行してください。",
    );
  }
  return body as T;
}
