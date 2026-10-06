import { afterEach, expect, it, vi } from "vitest";
import { fixtureDetail1 } from "~/features/tanbun/detail/fixture";
import { historyCache, tanbunDetailCache } from "~/shared/lib/indexed";
import { saveResourceText } from "./uploadApi";

afterEach(() => vi.unstubAllGlobals());

it("import成功時は単文詳細cacheを破棄し履歴は残す", async () => {
  await tanbunDetailCache.set(fixtureDetail1);
  await historyCache.clear();
  await historyCache.add({
    title: "単文",
    url: `/tanbun/${fixtureDetail1.uid}`,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
  );
  await saveResourceText({ txt: "# title", path: [] });
  expect(await tanbunDetailCache.get(fixtureDetail1.uid)).toBeUndefined();
  expect(await historyCache.getAll()).toHaveLength(1);
});

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
