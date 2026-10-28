import type { SkillTemplate } from "./catalog";
import type { TemplateOverride } from "./templateVariants";
import type { VariantSelection } from "./variantCore";
import { attachedSets, combinationKey, selectedSetValues } from "./variantCore";

export type { VariantSelection } from "./variantCore";
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
  const attached = attachedSets(ids, sets);
  if (attached.some((set) => !fieldApplies(set.field, template.effect)))
    throw new Error("この効果テンプレートでは変型セットの項目を使えません。");
  return attached;
}

export function selectedVariantValues(
  base: SkillTemplate,
  selections: VariantSelection[],
  sets: VariantSet[],
) {
  attachedVariantSets(base, sets);
  const { changes, labels } = selectedSetValues(
    base.variant_set_ids ?? [],
    selections,
    sets,
  );
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
  const existing = templates.find(
    (t) =>
      t.base_template_id === baseId &&
      t.variant_selections?.length &&
      combinationKey(t.variant_selections) === combinationKey(selections),
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
