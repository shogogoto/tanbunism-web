import type { SkillTemplate } from "./catalog";
import type { TemplateOverride } from "./templateVariants";

export type VariantSelection = { set_id: string; value_id: string };
export type VariantSetValue = {
  id: string;
  name: string;
  value: string | number | Record<string, unknown>;
};
export type VariantSet = {
  id: string;
  name: string;
  field: TemplateOverride;
  values: VariantSetValue[];
};

function fieldApplies(field: string, effect: string) {
  if (["effect", "damage_type", "target_count", "amount"].includes(field))
    return true;
  if (field === "multiplier") return effect === "attack";
  if (field === "stat" || field === "affected_element")
    return ["buff", "debuff"].includes(effect);
  if (field === "ailment") return effect === "ailment";
  if (field === "duration_turns" || field === "stack_limit")
    return ["buff", "debuff", "ailment"].includes(effect);
  return !["recover_moves", "equip_attack"].includes(effect);
}

export function attachedVariantSets(
  template: SkillTemplate,
  sets: VariantSet[],
) {
  const ids = template.variant_set_ids ?? [];
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
  if (attached.some((set) => !fieldApplies(set.field, template.effect)))
    throw new Error("この効果テンプレートでは変型セットの項目を使えません。");
  return attached;
}

export function selectedVariantValues(
  base: SkillTemplate,
  selections: VariantSelection[],
  sets: VariantSet[],
) {
  const attached = attachedVariantSets(base, sets);
  if (
    new Set(selections.map((s) => s.set_id)).size !== selections.length ||
    selections.some((s) => !attached.some((a) => a.id === s.set_id))
  )
    throw new Error(
      "組み合わせの変型セットが重複しているか、テンプレートに設定されていません。",
    );
  const changes: Record<string, unknown> = {};
  const labels: string[] = [];
  for (const set of attached) {
    const selected = selections.find((s) => s.set_id === set.id);
    if (!selected) continue;
    const value = set.values.find((v) => v.id === selected.value_id);
    if (!value) throw new Error("変型セットの候補が見つかりません。");
    changes[set.field] = value.value;
    labels.push(value.name);
  }
  if (
    Object.keys(changes).some(
      (field) => !fieldApplies(field, String(changes.effect ?? base.effect)),
    )
  )
    throw new Error("組み合わせた効果では、変型セットの項目を使えません。");
  return { changes, labels };
}

/** Only a chosen combination gets a reference; never expand a Cartesian product. */
export function combinationTemplate(
  templates: SkillTemplate[],
  baseId: string,
  selections: VariantSelection[],
): SkillTemplate {
  const base = templates.find((t) => t.id === baseId);
  if (!base) throw new Error("効果テンプレートが見つかりません。");
  const key = (items: VariantSelection[]) =>
    JSON.stringify([...items].sort((a, b) => a.set_id.localeCompare(b.set_id)));
  const existing = templates.find(
    (t) =>
      t.base_template_id === baseId &&
      t.variant_selections?.length &&
      key(t.variant_selections) === key(selections),
  );
  return (
    existing ?? {
      ...base,
      id: `combination_${crypto.randomUUID().replaceAll("-", "")}`,
      base_template_id: baseId,
      override_fields: [],
      variant_axis: undefined,
      variant_label: undefined,
      variant_selections: selections,
    }
  );
}
