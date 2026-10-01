import { afterEach, expect, it, vi } from "vitest";
import { saveResourceText } from "./uploadApi";

afterEach(() => vi.unstubAllGlobals());

it("JSONでないgatewayエラーのstatusと本文を保持する", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("<h1>Gateway Timeout</h1>", {
        status: 504,
        headers: { "Content-Type": "text/html" },
      }),
    ),
  );

  const response = await saveResourceText({ txt: "# title", path: [] });

  expect(response.status).toBe(504);
  expect(response.data).toEqual({
    detail: {
      code: 504,
      message: "HTTP 504: JSONではない応答です — <h1>Gateway Timeout</h1>",
    },
  });
});
