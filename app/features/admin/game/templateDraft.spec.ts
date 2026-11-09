import { expect, it } from "vitest";
import type { SkillTemplate } from "~/features/game/catalog";
import { applyTemplatePatch, templateDraftRows } from "./templateDraft";

const base: SkillTemplate = {
  id: "attack",
  name: "攻撃",
  effect: "attack",
  amount: 0,
  multiplier: 1,
  target_count: 1,
  on_wrong: { type: "counter" },
};

it("preserves variant inheritance and records changed fields without mutating inputs", () => {
  const variant: SkillTemplate = {
    ...base,
    id: "strong",
    name: "強攻撃",
    base_template_id: base.id,
    override_fields: ["multiplier"],
    multiplier: 2,
  };
  const templates = [base, variant];
  const original = structuredClone(templates);
  const next = applyTemplatePatch(templates, "strong", { target_count: 3 });
  expect(next[1]).toMatchObject({
    base_template_id: "attack",
    target_count: 3,
  });
  expect(next[1].override_fields).toContain("multiplier");
  expect(next[1].override_fields).toContain("target_count");
  expect(next[0]).toMatchObject({ id: "attack", multiplier: 1 });
  expect(templates).toEqual(original);
});

it("keeps reduced status effect strength in sync while retaining duration overrides", () => {
  const status: SkillTemplate = {
    id: "status",
    name: "状態",
    effect: "buff",
    stat: "defense",
    amount: 5,
    duration_turns: 3,
    on_wrong: { type: "reduced", amount: 5, duration_turns: 1 },
  };
  expect(
    applyTemplatePatch([status], "status", { amount: 10 })[0],
  ).toMatchObject({
    amount: 10,
    on_wrong: { type: "reduced", amount: 10, duration_turns: 1 },
  });
});

it("normalizes display rows without leaking display-only fields into stored templates", () => {
  expect(templateDraftRows([base])[0]).toMatchObject({
    target: "enemy",
    mp_cost: 0,
    enabled: true,
  });
  const [result] = applyTemplatePatch([base], "attack", { multiplier: 2 });
  expect(result).not.toHaveProperty("mp_cost");
  expect(result).not.toHaveProperty("icon");
  expect(result).not.toHaveProperty("enabled");
});
