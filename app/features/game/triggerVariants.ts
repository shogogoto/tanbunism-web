import type {
  GameCatalog,
  TriggerDefinition,
  TriggerVariantField,
} from "./catalog";

export function resolveTriggerVariantSets(catalog: GameCatalog): GameCatalog {
  const sets = catalog.trigger_variant_sets ?? [];
  if (new Set(sets.map((s) => s.id)).size !== sets.length)
    throw new Error("変型セットのIDが重複しています。");
  for (const set of sets) {
    if (!set.name.trim())
      throw new Error("変型セットの名前を入力してください。");
    if (new Set(set.values.map((v) => v.id)).size !== set.values.length)
      throw new Error("候補IDが重複しています。");
    for (const v of set.values) {
      if (!v.name.trim()) throw new Error("変型の副名を入力してください。");
      if (
        set.field === "threshold" &&
        (typeof v.value !== "number" ||
          !Number.isInteger(v.value) ||
          v.value < 1 ||
          v.value > 100)
      )
        throw new Error("しきい値は1〜100の整数にしてください。");
    }
  }
  return {
    ...catalog,
    triggers: catalog.triggers?.map((trigger) => {
      if (!trigger.variant_set_id) return trigger;
      const set = sets.find((s) => s.id === trigger.variant_set_id);
      if (!set) throw new Error("ガンビット変型セットが見つかりません。");
      return {
        ...trigger,
        variant_field: set.field,
        variants: set.values.map((v) => ({ ...v })),
      };
    }),
  };
}

export const triggerTargets = {
  enemy: "敵",
  self: "自分自身",
  ally: "味方",
} as const;
export const triggerVariantFields: Record<TriggerVariantField, string> = {
  target: "対象",
  condition: "条件・比較",
  threshold: "しきい値",
  state_skill_id: "状態スキル",
  state_present: "状態の有無",
};
export const triggerConditionLabels = {
  always: "いつでも",
  hp_below: "HPが以下（%）",
  hp_above: "HPが以上（%）",
  hp_equal: "HPが同じ（%）",
  mp_below: "MPが以下（%）",
  mp_above: "MPが以上（%）",
  mp_equal: "MPが同じ（%）",
  enemy_count: "敵の数が以上",
  state: "状態",
} as const;

export function triggerVariant(
  trigger: TriggerDefinition,
  id?: string | null,
): TriggerDefinition | undefined {
  if (!id) return trigger;
  const candidate = trigger.variants?.find((v) => v.id === id);
  if (!candidate) return undefined;
  const field = trigger.variant_field ?? "threshold";
  return {
    ...trigger,
    [field]: candidate.value,
  };
}
