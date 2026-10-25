import { expect, it } from "vitest";
import { skillFileText } from "~/features/admin/game/skillFiles";
import { resolveCatalogTemplates } from "./catalog";
import { sampleVariantSetCatalog } from "./catalog.fixtures";
import { combinationTemplate } from "./variantSets";

it("composes only selected combinations, reuses references and propagates shared values and names", () => {
  const selections = [
    { set_id: "range", value_id: "area" },
    { set_id: "tier", value_id: "mid" },
  ];
  const templates = sampleVariantSetCatalog.skill_templates ?? [];
  const combined = combinationTemplate(templates, "basic_spell", selections);
  const catalog = resolveCatalogTemplates({
    ...sampleVariantSetCatalog,
    skill_templates: [...templates, combined],
    skills: [
      { ...sampleVariantSetCatalog.skills[0], template_ids: [combined.id] },
    ],
  });
  expect(catalog.skill_templates).toHaveLength(2);
  expect(catalog.skill_templates?.[1]).toMatchObject({
    name: "魔法攻撃（中級, 範囲）",
    multiplier: 1.8,
    target_count: 3,
    variant_selections: selections,
  });
  expect(
    combinationTemplate(
      catalog.skill_templates ?? [],
      "basic_spell",
      [...selections].reverse(),
    ).id,
  ).toBe(combined.id);
  expect(catalog.skills[0]).toMatchObject({ multiplier: 1.8, target_count: 3 });
  expect(catalog.skills[0].effects?.[0]).not.toHaveProperty(
    "variant_selections",
  );
  const updated = resolveCatalogTemplates({
    ...catalog,
    variant_sets: catalog.variant_sets?.map((s) =>
      s.id === "tier"
        ? {
            ...s,
            values: s.values.map((v) =>
              v.id === "mid" ? { ...v, name: "中位", value: 2.2 } : v,
            ),
          }
        : s,
    ),
  });
  expect(updated.skill_templates?.[1]?.name).toBe("魔法攻撃（中位, 範囲）");
  expect(updated.skills[0].multiplier).toBe(2.2);
  const file = JSON.parse(
    skillFileText(
      updated.skills,
      updated.skill_templates,
      updated.elements,
      updated.variant_sets,
    ),
  );
  expect(file.version).toBe(6);
  expect(file.variant_sets).toEqual(updated.variant_sets);
  expect(file.skill_templates[1]).not.toHaveProperty("multiplier");
  expect(resolveCatalogTemplates(file).skills[0].multiplier).toBe(2.2);
});

it("rejects conflicting fields and removal of sets or values used by combinations", () => {
  const raw = structuredClone(sampleVariantSetCatalog);
  expect(() =>
    resolveCatalogTemplates({
      ...raw,
      variant_sets: raw.variant_sets?.map((s) => ({
        ...s,
        field: "target_count",
      })),
    }),
  ).toThrow(/同じ項目/);
  const combination = combinationTemplate(
    raw.skill_templates ?? [],
    "basic_spell",
    [{ set_id: "tier", value_id: "mid" }],
  );
  const selected = {
    ...raw,
    skill_templates: [...(raw.skill_templates ?? []), combination],
  };
  expect(() =>
    resolveCatalogTemplates({ ...selected, variant_sets: [] }),
  ).toThrow(/見つかりません/);
  expect(() =>
    resolveCatalogTemplates({
      ...selected,
      variant_sets: raw.variant_sets?.map((s) =>
        s.id === "tier" ? { ...s, values: [] } : s,
      ),
    }),
  ).toThrow(/候補が見つかりません/);
});
