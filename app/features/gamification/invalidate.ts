import type { ScopedMutator } from "swr";
import { genericCache } from "~/shared/lib/indexed";

export async function invalidateGamification(
  mutator: ScopedMutator,
  { preserveData = false }: { preserveData?: boolean } = {},
) {
  // 永続キャッシュの削除に失敗しても、表示中のXPは再取得する。
  await genericCache
    .deletePrefix("public:profile-detail:")
    .catch(() => undefined);
  const matches = (key: unknown) => {
    const text = typeof key === "string" ? key : JSON.stringify(key);
    return /learning-progress|resource-growth|profile-detail/.test(text ?? "");
  };
  if (preserveData) {
    await mutator(matches);
    return;
  }
  await mutator(matches, undefined, { revalidate: true });
}
