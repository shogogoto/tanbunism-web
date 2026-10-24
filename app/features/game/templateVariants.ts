import type { SkillTemplate } from "./catalog";

export const templateOverrideFields = [
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
    return {
      ...base,
      ...overrides,
      id: template.id,
      name: template.name,
      base_template_id: base.id,
      override_fields: template.override_fields ?? [],
    } as SkillTemplate;
  });
}
