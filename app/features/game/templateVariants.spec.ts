import { expect, it } from "vitest";
import { skillFileText } from "~/features/admin/game/skillFiles";
import { type SkillTemplate, resolveCatalogTemplates } from "./catalog";
import { sampleCatalog } from "./catalog.fixtures";
import {
  resolveTemplateVariants,
  templateDescendants,
  variantName,
} from "./templateVariants";
import { templateDifferences } from "./templateVariants";

const base = {
  id: "spell",
  name: "魔法",
  effect: "attack",
  amount: 0,
  multiplier: 1.5,
  target_count: 1,
  damage_type: "special",
} satisfies SkillTemplate;
const variant = {
  ...base,
  id: "area",
  name: "範囲",
  base_template_id: base.id,
  target_count: 3,
  override_fields: ["target_count"],
} satisfies SkillTemplate;

it("resolves nested variations in any order and exposes combined names and inherited changes", () => {
  const parent: SkillTemplate = {
    ...variant,
    variant_label: "範囲",
    variant_axis: "power",
  };
  const child: SkillTemplate = {
    ...variant,
    id: "strong",
    name: "古い表示名",
    base_template_id: parent.id,
    variant_label: "中級",
    override_fields: ["multiplier"],
    multiplier: 2,
  };
  const resolved = resolveTemplateVariants([child, parent, base]);
  expect(resolved[0]).toMatchObject({
    name: "魔法（範囲, 中級）",
    target_count: 3,
    multiplier: 2,
  });
  expect(resolved[1]).toMatchObject({
    name: "魔法（範囲）",
    variant_axis: "power",
  });
  expect(variantName(resolved, child.id, "高効率")).toBe(
    "魔法（範囲, 中級, 高効率）",
  );
  expect(templateDescendants(resolved, base.id).map((row) => row.id)).toEqual([
    child.id,
    parent.id,
  ]);
  const changed = resolveTemplateVariants([
    child,
    { ...parent, target_count: 5 },
    { ...base, amount: 10, multiplier: 4 },
  ]);
  expect(changed[0]).toMatchObject({
    target_count: 5,
    amount: 10,
    multiplier: 2,
  });
  const catalog = resolveCatalogTemplates({
    ...sampleCatalog,
    skill_templates: resolved,
    skills: [{ ...sampleCatalog.skills[0], template_ids: [child.id] }],
  });
  expect(catalog.skills[0]).toMatchObject({ target_count: 3, multiplier: 2 });
  const exported = JSON.parse(
    skillFileText(catalog.skills, catalog.skill_templates),
  );
  expect(exported.skill_templates[1]).toMatchObject({
    variant_axis: "power",
    variant_label: "範囲",
  });
});

it("rejects multi-node cycles and excessive depth", () => {
  expect(() =>
    resolveTemplateVariants([
      { ...variant, base_template_id: "other" },
      { ...variant, id: "other", base_template_id: variant.id },
    ]),
  ).toThrow(/循環/);
  const chain: SkillTemplate[] = [base];
  for (let index = 0; index < 17; index++)
    chain.push({
      ...base,
      id: `v_${index}`,
      base_template_id: index === 0 ? base.id : `v_${index - 1}`,
      override_fields: [],
    });
  expect(() => resolveTemplateVariants(chain)).toThrow(/16段/);
});

it("resolves stale materialized children in either order and keeps overrides", () => {
  const templates = resolveTemplateVariants([
    { ...variant, multiplier: 99 },
    { ...base, multiplier: 2 },
  ]);
  expect(templates[0]).toMatchObject({ target_count: 3, multiplier: 2 });
  const overridden = resolveTemplateVariants([
    {
      ...variant,
      multiplier: 0.8,
      override_fields: ["target_count", "multiplier"],
    },
    { ...base, multiplier: 2 },
  ]);
  expect(overridden[0]).toMatchObject({ target_count: 3, multiplier: 0.8 });
});

it("resolves skills from variants without leaking family metadata into effects", () => {
  const catalog = resolveCatalogTemplates({
    ...sampleCatalog,
    skill_templates: [base, variant],
    skills: [{ ...sampleCatalog.skills[0], template_ids: ["area"] }],
  });
  expect(catalog.skills[0]).toMatchObject({ target_count: 3, multiplier: 1.5 });
  expect(catalog.skills[0].effects?.[0]).not.toHaveProperty("base_template_id");
  const file = JSON.parse(
    skillFileText(catalog.skills, catalog.skill_templates),
  );
  expect(file.skill_templates[1]).toEqual({
    id: "area",
    name: "範囲",
    base_template_id: base.id,
    override_fields: ["target_count"],
    target_count: 3,
  });
});

it("rejects missing and cyclic parents but supports multiple levels", () => {
  expect(() => resolveTemplateVariants([variant])).toThrow(/共通設定/);
  expect(() =>
    resolveTemplateVariants([{ ...variant, base_template_id: variant.id }]),
  ).toThrow(/循環/);
  expect(
    resolveTemplateVariants([
      base,
      variant,
      { ...variant, id: "nested", base_template_id: variant.id },
    ])[2],
  ).toMatchObject({ target_count: 3 });
});

it("inherits any setting but keeps explicit kind and state details canonical", () => {
  const state: SkillTemplate = {
    id: "guard",
    name: "中級",
    effect: "buff",
    stat: "defense",
    amount: 20,
    amount_mode: "percent",
    duration_turns: 5,
    stack_limit: 2,
    on_wrong: { type: "counter" },
    base_template_id: base.id,
    override_fields: [
      "effect",
      "stat",
      "amount",
      "amount_mode",
      "duration_turns",
      "stack_limit",
      "on_wrong",
    ],
  };
  const resolved = resolveTemplateVariants([base, state])[1];
  expect(resolved).toMatchObject({
    effect: "buff",
    stat: "defense",
    amount: 20,
    duration_turns: 5,
    stack_limit: 2,
  });
  expect(resolved).not.toHaveProperty("multiplier");
  const file = JSON.parse(skillFileText([], [base, resolved]));
  expect(file.skill_templates[1]).toMatchObject({
    effect: "buff",
    stat: "defense",
    duration_turns: 5,
    on_wrong: { type: "counter" },
  });
});

it("links independent templates of different kinds by their actual differences", () => {
  const recovery: SkillTemplate = {
    id: "heal",
    name: "回復",
    effect: "heal_mp",
    amount: 25,
    amount_mode: "percent",
    on_wrong: { type: "fizzle" },
  };
  const fields = templateDifferences(base, recovery);
  expect(fields).toEqual(
    expect.arrayContaining(["effect", "amount", "amount_mode"]),
  );
  const linked = resolveTemplateVariants([
    base,
    { ...recovery, base_template_id: base.id, override_fields: fields },
  ])[1];
  expect(linked).toMatchObject({
    effect: "heal_mp",
    amount: 25,
    amount_mode: "percent",
  });
  expect(linked).not.toHaveProperty("multiplier");
});
