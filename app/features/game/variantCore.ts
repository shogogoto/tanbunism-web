/** Shared set references and composition; domains validate their own fields/values. */
export type VariantSelection = { set_id: string; value_id: string };
export type SharedVariantSet<F extends string = string, V = unknown> = {
  id: string;
  name: string;
  field: F;
  values: { id: string; name: string; value: V }[];
};
export function attachedSets<T extends SharedVariantSet>(
  ids: string[],
  sets: T[],
): T[] {
  const attached = ids.map((id) => {
    const set = sets.find((s) => s.id === id);
    if (!set) throw new Error("変型セットが見つかりません。");
    return set;
  });
  if (
    new Set(ids).size !== ids.length ||
    new Set(attached.map((s) => s.field)).size !== attached.length
  )
    throw new Error("同じ項目を変更する変型セットは併用できません。");
  return attached;
}
export function selectedSetValues(
  ids: string[],
  selections: VariantSelection[],
  sets: SharedVariantSet[],
) {
  const attached = attachedSets(ids, sets);
  if (
    new Set(selections.map((s) => s.set_id)).size !== selections.length ||
    selections.some((s) => !ids.includes(s.set_id))
  )
    throw new Error(
      "組み合わせの変型セットが重複しているか、親に設定されていません。",
    );
  const changes: Record<string, unknown> = {};
  const labels: string[] = [];
  for (const set of attached) {
    const selection = selections.find((s) => s.set_id === set.id);
    if (!selection) continue;
    const value = set.values.find((v) => v.id === selection.value_id);
    if (!value) throw new Error("変型セットの候補が見つかりません。");
    changes[set.field] = value.value;
    labels.push(value.name);
  }
  return { changes, labels };
}
export const combinationKey = (selections: VariantSelection[]) =>
  JSON.stringify(
    [...selections].sort((a, b) => a.set_id.localeCompare(b.set_id)),
  );
