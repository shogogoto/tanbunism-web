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

export const MAX_VARIANT_DEPTH = 16;

function legacyLabel(template: SkillTemplate, parentName: string) {
  const prefix = `${parentName}（`;
  return (
    template.variant_label ??
    (template.name.startsWith(prefix) && template.name.endsWith("）")
      ? template.name.slice(prefix.length, -1)
      : template.name)
  );
}

export function templateLineage(
  templates: SkillTemplate[],
  id: string,
): SkillTemplate[] {
  const path: SkillTemplate[] = [];
  const seen = new Set<string>();
  let current: string | null | undefined = id;
  while (current) {
    if (seen.has(current)) throw new Error("変型の参照が循環しています。");
    seen.add(current);
    const row = templates.find((item) => item.id === current);
    if (!row) throw new Error("共通設定が見つかりません。");
    path.push(row);
    if (path.length > MAX_VARIANT_DEPTH + 1)
      throw new Error("変型は最大16段までです。");
    current = row.base_template_id;
  }
  return path.reverse();
}

export function variantName(
  templates: SkillTemplate[],
  parentId: string,
  label: string,
): string {
  const path = templateLineage(templates, parentId);
  const labels = path
    .slice(1)
    .map((row, index) => legacyLabel(row, path[index].name));
  return `${path[0].name}（${[...labels, label].join(", ")}）`;
}

export function templateDescendants(
  templates: SkillTemplate[],
  id: string,
): SkillTemplate[] {
  const ids = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of templates) {
      if (
        row.base_template_id &&
        ids.has(row.base_template_id) &&
        !ids.has(row.id)
      ) {
        ids.add(row.id);
        changed = true;
      }
    }
  }
  return templates.filter((row) => row.id !== id && ids.has(row.id));
}

/** Resolve parents once, reject cycles, and preserve independent overrides at each level. */
export function resolveTemplateVariants(
  templates: SkillTemplate[],
): SkillTemplate[] {
  const entries = new Map(templates.map((row) => [row.id, row]));
  if (entries.size !== templates.length)
    throw new Error("効果テンプレートのIDが重複しています。");
  const resolved = new Map<string, SkillTemplate>();
  const parts = new Map<string, { root: string; labels: string[] }>();
  const visiting = new Set<string>();
  function resolve(id: string): SkillTemplate {
    const cached = resolved.get(id);
    if (cached) return cached;
    if (visiting.has(id)) throw new Error("変型の参照が循環しています。");
    const template = entries.get(id);
    if (!template) throw new Error("共通設定が見つかりません。");
    visiting.add(id);
    if (visiting.size > MAX_VARIANT_DEPTH + 1)
      throw new Error("変型は最大16段までです。");
    if (!template.base_template_id) {
      parts.set(id, { root: template.name, labels: [] });
      resolved.set(id, template);
      visiting.delete(id);
      return template;
    }
    const base = resolve(template.base_template_id);
    const parent = parts.get(base.id);
    if (!parent) throw new Error("共通設定が見つかりません。");
    const labels = [...parent.labels, legacyLabel(template, base.name)];
    if (labels.length > MAX_VARIANT_DEPTH)
      throw new Error("変型は最大16段までです。");
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
      name: template.variant_label
        ? `${parent.root}（${labels.join(", ")}）`
        : template.name,
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
    const result = {
      ...normalized,
      override_fields: normalized.override_fields?.filter(
        (key) => key in normalized,
      ),
    };
    parts.set(id, { root: parent.root, labels });
    resolved.set(id, result);
    visiting.delete(id);
    return result;
  }
  return templates.map((template) => resolve(template.id));
}
