import {
  type SkillDefinition,
  type SkillTemplate,
  normalizeSkill,
  skillTemplate,
} from "./catalog";

export const templateOverrideFields = [
  "effect",
  "damage_type",
  "stat",
  "affected_element",
  "stack_limit",
  "ailment",
  "target_count",
  "amount",
  "amount_mode",
  "multiplier",
  "duration_turns",
  "on_wrong",
] as const;
export type TemplateOverride = (typeof templateOverrideFields)[number];
export const templatePowerFields: TemplateOverride[] = [
  "amount",
  "amount_mode",
  "multiplier",
  "duration_turns",
  "on_wrong",
];

export function templateDifferences(
  base: SkillTemplate,
  variant: SkillTemplate,
): TemplateOverride[] {
  return templateOverrideFields.filter(
    (key) =>
      key in variant &&
      JSON.stringify(variant[key as keyof SkillTemplate]) !==
        JSON.stringify(base[key as keyof SkillTemplate]),
  );
}

/** Parent rows are always independent: resolve once, never recursively. */
export function resolveTemplateVariants(
  templates: SkillTemplate[],
): SkillTemplate[] {
  return templates.map((template) => {
    if (!template.base_template_id) return template;
    const base = templates.find((row) => row.id === template.base_template_id);
    if (!base || base.base_template_id)
      throw new Error(
        "共通設定が見つからないか、継承が二段以上になっています。",
      );
    const overrides = Object.fromEntries(
      (template.override_fields ?? []).map((key) => [
        key,
        template[key as keyof SkillTemplate],
      ]),
    );
    const merged = {
      ...base,
      ...overrides,
      id: template.id,
      name: template.name,
      base_template_id: base.id,
      override_fields: template.override_fields ?? [],
      variant_axis: template.variant_axis,
      variant_label: template.variant_label,
    } as SkillTemplate;
    const normalized = skillTemplate(
      normalizeSkill({
        ...merged,
        target: "self",
        icon: "sparkles",
        enabled: true,
        mp_cost: 0,
      } as SkillDefinition),
      merged,
    );
    return {
      ...normalized,
      override_fields: normalized.override_fields?.filter(
        (key) => key in normalized,
      ),
    };
  });
}
