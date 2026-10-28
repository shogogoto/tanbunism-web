import { expect, it } from "vitest";
import type { TriggerDefinition } from "./catalog";
import { statCondition } from "./triggerConditions";
import { triggerDescription, triggerVariant } from "./triggerVariants";

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
