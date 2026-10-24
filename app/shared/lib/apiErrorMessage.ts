/** Render FastAPI validation details without coercing objects or exposing inputs. */
export function apiErrorMessage(body: unknown, fallback: string): string {
  function message(value: unknown): string | undefined {
    if (typeof value === "string") return value.trim() || undefined;
    if (Array.isArray(value)) {
      const messages = value
        .map(message)
        .filter((text): text is string => Boolean(text));
      return [...new Set(messages)].join("\n") || undefined;
    }
    if (value && typeof value === "object") {
      const detail = value as Record<string, unknown>;
      return message(detail.detail ?? detail.message ?? detail.msg);
    }
    return undefined;
  }
  return message(body) ?? fallback;
}
