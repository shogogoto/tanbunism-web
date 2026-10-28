import type { GameCatalog, TriggerDefinition, TriggerVariant } from "./catalog";
import { statCondition } from "./triggerConditions";
import {
  type VariantSelection,
  attachedSets,
  combinationKey,
  selectedSetValues,
} from "./variantCore";

export const MAX_TRIGGER_VARIANTS = 200;
export const MAX_TRIGGER_VARIANT_DEPTH = 16;

export function applyTriggerPatch(
  base: TriggerDefinition,
  patch: Record<string, unknown>,
): TriggerDefinition {
  const normalized =
    ["stat", "stat_basis", "comparison"].some((field) => field in patch) &&
    /^(hp|mp)_/.test(base.condition);
  const result = {
    ...base,
    ...(normalized
      ? { ...statCondition(base), condition: "stat" as const }
      : {}),
    ...patch,
  } as TriggerDefinition;
  if (
    normalized &&
    !["hp", "mp"].includes(result.stat ?? "hp") &&
    !("stat_basis" in patch)
  )
    result.stat_basis = "current";
  return result;
}

export function resolveTriggerTree(
  root: TriggerDefinition,
  catalog: GameCatalog,
): TriggerDefinition {
  const sets = catalog.trigger_variant_sets ?? [];
  let trigger = { ...root };
  if (trigger.variant_set_id) {
    const shared = sets.find((s) => s.id === trigger.variant_set_id);
    if (!shared) throw new Error("ガンビット変型セットが見つかりません。");
    trigger = {
      ...trigger,
      variant_set_ids: [shared.id],
      variant_set_id: null,
      variants: shared.values.map((v) => ({
        id: v.id,
        name: v.name,
        variant_selections: [{ set_id: shared.id, value_id: v.id }],
      })),
    };
  }
  attachedSets(trigger.variant_set_ids ?? [], sets);
  const variants = trigger.variants ?? [];
  if (new Set(variants.map((v) => v.id)).size !== variants.length)
    throw new Error("トリガーの変型IDが重複しています。");
  if (variants.length > MAX_TRIGGER_VARIANTS)
    throw new Error("変型は200件まで設定できます。");
  const cache = new Map<string, TriggerVariant>();
  const visiting = new Set<string>();
  const depths = new Map<string, number>();
  function resolve(id: string, depth = 0): TriggerVariant {
    if (visiting.has(id) || depth >= MAX_TRIGGER_VARIANT_DEPTH)
      throw new Error("変型の参照が循環しているか、階層が深すぎます。");
    const cached = cache.get(id);
    if (cached) return cached;
    const row = variants.find((v) => v.id === id);
    if (!row) throw new Error("親の変型が見つかりません。");
    visiting.add(id);
    const parent = row.base_variant_id
      ? resolve(row.base_variant_id, depth + 1)
      : undefined;
    const level = row.base_variant_id
      ? (depths.get(row.base_variant_id) ?? 0) + 1
      : 1;
    if (level > MAX_TRIGGER_VARIANT_DEPTH)
      throw new Error("変型の階層が深すぎます。");
    const base = { ...trigger, ...parent?.resolved_values };
    const inherited =
      parent?.effective_set_ids ?? trigger.variant_set_ids ?? [];
    const own = row.variant_set_ids ?? [];
    if (new Set(own).size !== own.length)
      throw new Error("変型セットの参照が重複しています。");
    const ids = [...new Set([...inherited, ...own])];
    if (ids.length > 8) throw new Error("変型セットは8個まで設定できます。");
    attachedSets(ids, sets);
    const selections = row.variant_selections ?? [];
    if (
      selections.length &&
      ((row.value !== undefined && row.value !== null) || row.field)
    )
      throw new Error("セットの組み合わせと個別の上書きは併用できません。");
    const field =
      row.field ??
      variants.find((v) => v.id === row.base_variant_id)?.child_field ??
      trigger.variant_field ??
      "threshold";
    const { changes, labels } = selections.length
      ? selectedSetValues(inherited, selections, sets)
      : {
          changes:
            row.value !== undefined && row.value !== null
              ? { [field]: row.value }
              : {},
          labels: [row.name],
        };
    const values = applyTriggerPatch(base, changes);
    const fields = [
      "condition",
      "target",
      "threshold",
      "state_skill_id",
      "state_present",
      "stat",
      "stat_basis",
      "comparison",
    ] as const;
    const result: TriggerVariant = {
      ...row,
      resolved_values: Object.fromEntries(
        fields
          .filter((key) => values[key] !== undefined)
          .map((key) => [key, values[key]]),
      ),
      resolved_name: [parent?.resolved_name, ...labels]
        .filter(Boolean)
        .join(", "),
      effective_set_ids: ids,
    };
    cache.set(id, result);
    depths.set(id, level);
    visiting.delete(id);
    return result;
  }
  return trigger.variants
    ? { ...trigger, variants: variants.map((v) => resolve(v.id)) }
    : trigger;
}

export function combinationTrigger(
  trigger: TriggerDefinition,
  parentId: string | undefined,
  selections: VariantSelection[],
): TriggerVariant {
  if (!selections.length) throw new Error("候補を一つ以上選んでください。");
  return (
    trigger.variants?.find(
      (v) =>
        (v.base_variant_id ?? undefined) === parentId &&
        v.variant_selections?.length &&
        combinationKey(v.variant_selections) === combinationKey(selections),
    ) ?? {
      id: `combination_${crypto.randomUUID().replaceAll("-", "")}`,
      name: "組み合わせ",
      base_variant_id: parentId,
      variant_selections: selections,
    }
  );
}
