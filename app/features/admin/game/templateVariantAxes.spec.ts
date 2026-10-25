import { expect, it } from "vitest";
import type { SkillTemplate } from "~/features/game/catalog";
import { resolveTemplateVariants } from "~/features/game/templateVariants";
import { axisVariant, templateSkill, variantAxes } from "./templateVariantAxes";

const attack: SkillTemplate = {
  id: "base",
  name: "魔法",
  effect: "attack",
  multiplier: 1.2,
  amount: 0,
  target_count: 1,
  damage_type: "special",
  on_wrong: { type: "reduced", amount: 0, multiplier: 0.5 },
};
const status: SkillTemplate = {
  id: "state",
  name: "補正",
  effect: "buff",
  stat: "attack",
  amount: 20,
  amount_mode: "percent",
  stack_limit: 1,
  duration_turns: 3,
  on_wrong: { type: "reduced", amount: 20, duration_turns: 1 },
};
const elements = [{ id: "fire", name: "炎", enabled: true }];

it.each([
  [attack, "target_count", "3", { target_count: 3 }],
  [attack, "kind", "status", { effect: "buff" }],
  [attack, "resource", "mp", { effect: "damage_mp" }],
  [attack, "power", "1.8", { multiplier: 1.8 }],
  [
    attack,
    "wrong_power",
    "0.2",
    { on_wrong: { type: "reduced", multiplier: 0.2 } },
  ],
  [status, "detail", "debuff", { effect: "debuff" }],
  [status, "resource", "maxMp", { stat: "maxMp", amount_mode: "percent" }],
  [status, "resource", "speed", { stat: "speed" }],
  [status, "amount", "30", { amount: 30 }],
  [status, "stack_limit", "4", { stack_limit: 4 }],
  [status, "power", "5", { duration_turns: 5 }],
  [
    status,
    "wrong_power",
    "2",
    { on_wrong: { type: "reduced", duration_turns: 2 } },
  ],
] as const)("varies one visible input %s %s", (base, id, value, expected) => {
  const axis = variantAxes(base, elements).find((item) => item.id === id);
  if (!axis) throw new Error(`Missing axis ${id}`);
  const child = axisVariant(base, axis, value, {
    ...base,
    id: "child",
    name: "変型",
  });
  expect(child).toMatchObject(expected);
  const [resolved] = resolveTemplateVariants([child, base]);
  expect(resolved).toMatchObject(expected);
});

it("retains an explicit value equal to the common value without freezing other settings", () => {
  const axis = variantAxes(attack).find((item) => item.id === "power");
  if (!axis) throw new Error("Missing power axis");
  const child = axisVariant(attack, axis, "1.2", { ...attack, id: "child" });
  expect(child.override_fields).toEqual(["multiplier"]);
  const [resolved] = resolveTemplateVariants([
    child,
    { ...attack, multiplier: 2, target_count: 3 },
  ]);
  expect(resolved).toMatchObject({ multiplier: 1.2, target_count: 3 });
});

it("adapts detail and effect choices to the current template", () => {
  const attackAxes = variantAxes(attack);
  expect(attackAxes.find((axis) => axis.id === "wrong_mode")).toBeDefined();
  const stateAxes = variantAxes(status);
  expect(stateAxes.find((axis) => axis.id === "power")?.label).toContain(
    "行動数",
  );
  expect(stateAxes.find((axis) => axis.id === "wrong_mode")).toBeUndefined();
  const elemental = {
    ...status,
    stat: "damageDealt",
    affected_element: "fire",
  } as SkillTemplate;
  const elementalAxes = variantAxes(elemental, elements);
  expect(
    elementalAxes.find((axis) => axis.id === "affected_element")?.options,
  ).toEqual({ fire: "炎" });
  expect(
    elementalAxes.find((axis) => axis.id === "amount_mode"),
  ).toBeUndefined();
  expect(templateSkill(elemental).stat).toBe("damageDealt");
});
