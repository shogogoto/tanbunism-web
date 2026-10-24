import { expect, it } from "vitest";
import { skillFileText } from "~/features/admin/game/skillFiles";
import { type SkillTemplate, resolveCatalogTemplates } from "./catalog";
import { sampleCatalog } from "./catalog.fixtures";
import { resolveTemplateVariants } from "./templateVariants";

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

it("rejects missing, self and multi-level parents", () => {
  expect(() => resolveTemplateVariants([variant])).toThrow(/共通設定/);
  expect(() =>
    resolveTemplateVariants([{ ...variant, base_template_id: variant.id }]),
  ).toThrow(/共通設定/);
  expect(() =>
    resolveTemplateVariants([
      base,
      variant,
      { ...variant, id: "nested", base_template_id: variant.id },
    ]),
  ).toThrow(/二段/);
});
