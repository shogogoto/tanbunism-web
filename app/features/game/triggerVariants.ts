import type { TriggerDefinition, TriggerVariantField } from "./catalog";

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
  mp_below: "MPが以下（%）",
  mp_above: "MPが以上（%）",
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
