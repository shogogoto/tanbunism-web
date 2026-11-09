import { afterEach, expect, it, vi } from "vitest";
import { ApiError, requestJson } from "./requestJson";

afterEach(() => vi.unstubAllGlobals());
const options = { errorMessage: "取得できませんでした。" };

it("preserves request options and adds only the default session credentials", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetch);
  const controller = new AbortController();
  const body = new FormData();
  body.append("file", "text");
  await expect(
    requestJson(
      "/api",
      { method: "POST", body, signal: controller.signal, cache: "no-store" },
      options,
    ),
  ).resolves.toEqual({ ok: true });
  expect(fetch).toHaveBeenCalledWith("/api", {
    method: "POST",
    body,
    signal: controller.signal,
    cache: "no-store",
    credentials: "include",
  });
});

it("accepts 204 without parsing it as JSON", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
  );
  await expect(
    requestJson("/api", undefined, options),
  ).resolves.toBeUndefined();
});

it("normalizes validation errors without exposing validation inputs", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { detail: [{ msg: "値が必要です", input: "private" }] },
          { status: 422 },
        ),
      ),
  );
  await expect(requestJson("/api", undefined, options)).rejects.toMatchObject({
    message: "値が必要です",
    status: 422,
  });
});

it("preserves feature-specific error types and HTTP status", async () => {
  class FeatureError extends ApiError {}
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ detail: "権限がありません" }, { status: 403 }),
      ),
  );
  await expect(
    requestJson("/api", undefined, {
      ...options,
      createError: (message, status) => new FeatureError(message, status),
    }),
  ).rejects.toBeInstanceOf(FeatureError);
});

it("never retries failed writes or displays raw proxy responses", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response("<html>private proxy detail</html>", { status: 502 }),
    );
  vi.stubGlobal("fetch", fetch);
  await expect(
    requestJson("/api", { method: "PUT" }, options),
  ).rejects.toMatchObject({ message: options.errorMessage, status: 502 });
  expect(fetch).toHaveBeenCalledOnce();
});

it("rejects malformed successful responses and preserves aborts", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("not json"));
  vi.stubGlobal("fetch", fetch);
  await expect(requestJson("/api", undefined, options)).rejects.toMatchObject({
    status: 200,
  });
  const abort = new DOMException("cancelled", "AbortError");
  fetch.mockRejectedValue(abort);
  await expect(requestJson("/api", undefined, options)).rejects.toBe(abort);
});
