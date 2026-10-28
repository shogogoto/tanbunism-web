import { expect, it } from "vitest";
import type { TriggerDefinition } from "./catalog";
import { statCondition } from "./triggerConditions";
import {
  applicableTriggerVariantFields,
  triggerDescription,
  triggerThresholdBounds,
  triggerVariant,
} from "./triggerVariants";

const hp: TriggerDefinition = {
  id: "hp",
  name: "HP",
  condition: "hp_below",
  threshold: 30,
  enabled: true,
};

it("normalizes percentage predicates without confusing the new stat fields", () => {
  expect(statCondition(hp)).toEqual({
    stat: "hp",
    stat_basis: "percent",
    comparison: "below",
  });
  expect(triggerDescription(hp)).toContain("未満");
  expect(
    triggerDescription({
      ...hp,
      condition: "stat",
      stat: "defense",
      comparison: "lowest",
    }),
  ).toBe("守 · 現在値 · 低い順");
});

it("allows rank and stat variants on existing percentage definitions", () => {
  const ranked = triggerVariant(
    {
      ...hp,
      variant_field: "comparison",
      variants: [{ id: "low", name: "低", value: "lowest" }],
    },
    "low",
  );
  expect(ranked).toMatchObject({
    condition: "stat",
    stat: "hp",
    stat_basis: "percent",
    comparison: "lowest",
  });
  const defense = triggerVariant(
    {
      ...hp,
      variant_field: "stat",
      variants: [{ id: "guard", name: "守", value: "defense" }],
    },
    "guard",
  );
  expect(defense).toMatchObject({
    condition: "stat",
    stat: "defense",
    stat_basis: "current",
    comparison: "below",
  });
  expect(hp.condition).toBe("hp_below");
});

it("uses only the fields and bounds present in each condition's details", () => {
  expect(Object.keys(applicableTriggerVariantFields(hp))).toEqual([
    "target",
    "condition",
    "threshold",
    "stat",
    "comparison",
    "stat_basis",
  ]);
  expect(triggerThresholdBounds(hp)).toEqual({ min: 0, max: 100 });
  const absolute = {
    ...hp,
    condition: "stat" as const,
    stat_basis: "current" as const,
  };
  expect(triggerThresholdBounds(absolute).max).toBe(100000);
  const rank = {
    ...absolute,
    stat: "defense" as const,
    comparison: "lowest" as const,
  };
  expect(Object.keys(applicableTriggerVariantFields(rank))).toEqual([
    "target",
    "condition",
    "stat",
    "comparison",
  ]);
  const state = { ...hp, condition: "state" as const };
  expect(Object.keys(applicableTriggerVariantFields(state))).toEqual([
    "target",
    "condition",
    "state_skill_id",
    "state_present",
  ]);
  const count = { ...hp, condition: "enemy_count" as const };
  expect(Object.keys(applicableTriggerVariantFields(count))).toEqual([
    "target",
    "condition",
    "threshold",
  ]);
  expect(triggerThresholdBounds(count)).toEqual({ min: 1, max: 20 });
  expect(
    Object.keys(applicableTriggerVariantFields({ ...hp, condition: "always" })),
  ).toEqual(["target", "condition"]);
});
