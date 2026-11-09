import { apiErrorMessage } from "./apiErrorMessage";
import { networkFetch } from "./networkFetch";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type JsonRequestOptions = {
  errorMessage: string;
  invalidJsonMessage?: string;
  createError?: (message: string, status: number) => Error;
};

/** One transport boundary: no retries, no cache policy, no feature notifications. */
export async function requestJson<T>(
  url: RequestInfo | URL,
  init: RequestInit | undefined,
  {
    errorMessage,
    invalidJsonMessage,
    createError = (message, status) => new ApiError(message, status),
  }: JsonRequestOptions,
): Promise<T> {
  const response = await networkFetch(url, { credentials: "include", ...init });
  const text = response.status === 204 ? "" : await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    // Never show raw HTML/proxy responses, or retry a possibly committed write.
    throw createError(
      invalidJsonMessage ??
        (response.ok
          ? "サーバーからJSONではない応答が返されました。"
          : errorMessage),
      response.status,
    );
  }
  if (!response.ok)
    throw createError(apiErrorMessage(body, errorMessage), response.status);
  if (response.status !== 204 && !text)
    throw createError(
      invalidJsonMessage ?? "サーバーからJSONではない応答が返されました。",
      response.status,
    );
  return body as T;
}
