import type { ScopedMutator } from "swr";
import { genericCache } from "~/shared/lib/indexed";

export async function invalidateGamification(mutator: ScopedMutator) {
  await genericCache.deletePrefix("public:profile-detail:");
  await mutator(
    (key) => {
      const text = typeof key === "string" ? key : JSON.stringify(key);
      return /learning-progress|resource-growth|profile-detail/.test(
        text ?? "",
      );
    },
    undefined,
    { revalidate: true },
  );
}
