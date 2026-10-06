import { invalidateQuizCache } from "~/features/quiz/cache";
import { invalidateTanbunDetails } from "~/features/tanbun/detail/cache";
import {
  getPostTextResourceTextPostUrl,
  type postTextResourceTextPostResponse,
} from "~/shared/generated/entry/entry";
import type { ResourceTextBody } from "~/shared/generated/fastAPI.schemas";

/** JSONでないgatewayエラーも、ファイル単位の診断として返す. */
export async function saveResourceText(
  body: ResourceTextBody,
  options?: RequestInit,
): Promise<postTextResourceTextPostResponse> {
  const response = await fetch(getPostTextResourceTextPostUrl(), {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(body),
  });
  const raw = [204, 205, 304].includes(response.status)
    ? ""
    : await response.text();
  let data: unknown = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      const summary = raw.replaceAll(/\s+/g, " ").trim().slice(0, 500);
      data = {
        detail: {
          code: response.status,
          message: `HTTP ${response.status}: JSONではない応答です${summary ? ` — ${summary}` : ""}`,
        },
      };
    }
  }
  const result = {
    data,
    status: response.status,
    headers: response.headers,
  } as postTextResourceTextPostResponse;
  if (response.ok)
    await Promise.all([
      invalidateQuizCache("study-resources", "quiz-chain"),
      invalidateTanbunDetails().catch(() => undefined),
    ]);
  return result;
}
