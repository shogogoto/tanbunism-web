import { beforeEach, describe, expect, it } from "vitest";
import {
  clearApplicationCaches,
  db,
  genericCache,
  historyCache,
  resourceSearchCache,
  tanbunSearchCache,
} from "./indexed";

describe("genericCache", () => {
  beforeEach(async () => {
    await genericCache.clear();
  });

  it("期限切れの項目を次の保存時に削除する", async () => {
    await db.cache.put({
      key: "expired",
      value: "old",
      expires: Date.now() - 1,
    });

    await genericCache.set("current", "new");

    expect(await genericCache.get("expired")).toBeUndefined();
    expect(await genericCache.get("current")).toBe("new");
  });

  it("新しい項目を残して最大200件に制限する", async () => {
    const now = Date.now();
    await db.cache.bulkPut(
      Array.from({ length: 200 }, (_, index) => ({
        key: `old-${index}`,
        value: index,
        expires: now + 60_000 + index,
      })),
    );

    await genericCache.set("new", "latest");

    expect(await genericCache.count()).toBe(200);
    expect(await genericCache.get("old-0")).toBeUndefined();
    expect(await genericCache.get("new")).toBe("latest");
  });

  it("項目ごとのTTLとprefixによる削除を利用できる", async () => {
    await genericCache.set("quiz:answers:1", "answer", 60_000);
    await genericCache.set("quiz:chains:1", "chain", 60_000);
    await genericCache.set("search:knowledge", "result", 60_000);

    await genericCache.deletePrefix("quiz:");

    expect(await genericCache.get("quiz:answers:1")).toBeUndefined();
    expect(await genericCache.get("quiz:chains:1")).toBeUndefined();
    expect(await genericCache.get("search:knowledge")).toBe("result");
  });
});

describe("clearApplicationCaches", () => {
  beforeEach(async () => {
    await Promise.all([
      genericCache.clear(),
      tanbunSearchCache.clear(),
      resourceSearchCache.clear(),
      historyCache.clear(),
    ]);
  });

  it("APIキャッシュだけを削除し閲覧履歴を保持する", async () => {
    await genericCache.set("private:dashboard", { count: 1 });
    await tanbunSearchCache.set("query", {
      data: [],
      resource_infos: {},
      total: 0,
    });
    await resourceSearchCache.set("resources", { data: [], total: 0 });
    await historyCache.add({ title: "検索", url: "/search" });

    await clearApplicationCaches();

    expect(await genericCache.count()).toBe(0);
    expect(await tanbunSearchCache.count()).toBe(0);
    expect(await resourceSearchCache.count()).toBe(0);
    expect(await historyCache.getAll()).toHaveLength(1);
  });
});
