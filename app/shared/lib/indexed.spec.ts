import { beforeEach, describe, expect, it } from "vitest";
import { db, genericCache } from "./indexed";

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
});
