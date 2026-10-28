import type {
  GameCatalog,
  TriggerDefinition,
  TriggerVariantField,
} from "./catalog";
import { statCondition } from "./triggerConditions";
import { resolveTriggerTree } from "./triggerVariantTree";

export const triggerStatLabels = {
  hp: "HP",
  mp: "MP",
  attack: "攻",
  defense: "守",
  special_attack: "特攻",
  special_defense: "特守",
  speed: "速さ",
} as const;
export const triggerBasisLabels = {
  current: "現在値",
  maximum: "最大値",
  percent: "残量（%）",
} as const;
export const triggerComparisonLabels = {
  above: "以上",
  below: "未満",
  equal: "同じ",
  lowest: "低い順",
  highest: "高い順",
} as const;

export function triggerDescription(trigger: TriggerDefinition) {
  if (trigger.condition !== "stat")
    return `${triggerConditionLabels[trigger.condition]}${["always", "state"].includes(trigger.condition) ? "" : ` ${trigger.threshold}`}`;
  const details = statCondition(trigger);
  const rank = ["lowest", "highest"].includes(details.comparison);
  return `${triggerStatLabels[details.stat]} · ${triggerBasisLabels[details.stat_basis]} · ${rank ? "" : `${trigger.threshold}${details.stat_basis === "percent" ? "%" : ""} `}${triggerComparisonLabels[details.comparison]}`;
}

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
          v.value < 0 ||
          v.value > 100000)
      )
        throw new Error("しきい値は0〜100000の整数にしてください。");
    }
  }
  return {
    ...catalog,
    triggers: catalog.triggers?.map((trigger) =>
      resolveTriggerTree(trigger, catalog),
    ),
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
  stat: "ステータス",
  stat_basis: "値の基準",
  comparison: "比較・順位",
};

/** Only offer fields used by the resolved condition, including nested variants. */
export function applicableTriggerVariantFields(trigger: TriggerDefinition) {
  const fields: TriggerVariantField[] = ["target", "condition"];
  if (trigger.condition === "state")
    fields.push("state_skill_id", "state_present");
  else if (trigger.condition === "enemy_count") fields.push("threshold");
  else if (
    trigger.condition === "stat" ||
    /^(hp|mp)_/.test(trigger.condition)
  ) {
    const details = statCondition(trigger);
    if (!["lowest", "highest"].includes(details.comparison))
      fields.push("threshold");
    fields.push("stat", "comparison");
    if (["hp", "mp"].includes(details.stat)) fields.push("stat_basis");
  }
  return Object.fromEntries(
    fields.map((field) => [field, triggerVariantFields[field]]),
  );
}

export function triggerThresholdBounds(trigger: TriggerDefinition) {
  if (trigger.condition === "enemy_count") return { min: 1, max: 20 };
  return {
    min: 0,
    max: statCondition(trigger).stat_basis === "percent" ? 100 : 100000,
  };
}
export const triggerConditionLabels = {
  always: "いつでも",
  hp_below: "HPが未満（%）",
  hp_above: "HPが以上（%）",
  hp_equal: "HPが同じ（%）",
  mp_below: "MPが未満（%）",
  mp_above: "MPが以上（%）",
  mp_equal: "MPが同じ（%）",
  enemy_count: "敵の数が以上",
  state: "状態",
  stat: "ステータス",
} as const;

export function triggerVariant(
  trigger: TriggerDefinition,
  id?: string | null,
): TriggerDefinition | undefined {
  if (!id) return trigger;
  const candidate = trigger.variants?.find((v) => v.id === id);
  if (!candidate) return undefined;
  if (candidate.resolved_values)
    return { ...trigger, ...candidate.resolved_values };
  const field = trigger.variant_field ?? "threshold";
  const normalized =
    (["stat", "stat_basis", "comparison"].includes(field) &&
      trigger.condition.startsWith("hp_")) ||
    (["stat", "stat_basis", "comparison"].includes(field) &&
      trigger.condition.startsWith("mp_"));
  const patch = normalized
    ? {
        ...statCondition(trigger),
        condition: "stat" as const,
        [field]: candidate.value,
      }
    : { [field]: candidate.value };
  if (
    normalized &&
    field === "stat" &&
    !["hp", "mp"].includes(String(candidate.value))
  )
    patch.stat_basis = "current";
  return {
    ...trigger,
    ...patch,
  };
}
