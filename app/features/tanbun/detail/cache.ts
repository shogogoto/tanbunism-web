import { mutate } from "swr";
import { tanbunDetailCache } from "~/shared/lib/indexed";

/** UUIDの表記が違ってもページとプレビューで同じキャッシュを使う。 */
export function canonicalSentenceId(id: string) {
  const hex = id.replaceAll("-", "");
  return /^[0-9a-f]{32}$/i.test(hex)
    ? hex
        .toLowerCase()
        .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5")
    : id;
}

/** 更新で関係先も変わるため、単文詳細の共通キャッシュを破棄する。 */
export async function invalidateTanbunDetails() {
  await tanbunDetailCache.clear();
  await mutate(
    (key) =>
      Array.isArray(key) &&
      typeof key[0] === "string" &&
      (key[0].includes("/tanbun/sentence/") ||
        key[0] === "tanbun-preview-quiz"),
    undefined,
    { revalidate: false },
  );
}
