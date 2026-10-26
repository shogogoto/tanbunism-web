import { expect, it } from "vitest";
import {
  type SkillDefinition,
  actionDamage,
  effectAmount,
  isEquipmentSkill,
  modifiedStat,
  normalizeSkill,
  poisonDamage,
  prepareSkillCatalog,
} from "./catalog";

it("keeps infinite state duration in normalized definitions and treats a null expiry as active", () => {
  const skill = normalizeSkill({
    ...sampleCatalog.skills[0],
    effect: "buff",
    duration_turns: "infinite",
    stat: "attack",
    amount: 5,
  });
  expect(skill.duration_turns).toBe("infinite");
  const battle = {
    turn: 10000,
    effects: [
      { skill, target_id: "player", starts_turn: 1, expires_turn: null },
    ],
  };
  expect(modifiedStat(10, battle, "player", "attack")).toBe(15);
  expect(modifiedStat(10, { ...battle, turn: 0 }, "player", "attack")).toBe(10);
});
import { sampleCatalog } from "./catalog.fixtures";

it("migrates legacy equipment effects to shared buffs without changing item ownership", () => {
  const input = {
    ...sampleCatalog,
    skills: [
      ...sampleCatalog.skills,
      normalizeSkill({
        id: "sword_power",
        name: "剣の効果",
        icon: "sword",
        enabled: true,
        effect: "equip_attack",
        target: "self",
        amount: 8,
        mp_cost: 0,
      }),
    ],
  };
  const result = prepareSkillCatalog(input);
  const skill = result.skills.at(-1);
  expect(skill).toMatchObject({
    effect: "buff",
    stat: "attack",
    amount: 8,
    amount_mode: "fixed",
  });
  expect(result.skill_templates?.at(-1)).toMatchObject({
    effect: "buff",
    stat: "attack",
    amount: 8,
  });
  expect(input.skills.at(-1)?.effect).toBe("equip_attack");
  expect(isEquipmentSkill(skill as SkillDefinition)).toBe(true);
  expect(isEquipmentSkill(sampleCatalog.skills[0])).toBe(false);
});

it("boosts only the selected target or all enemies without affecting ordinary attacks", () => {
  const action = {
    name: "ファイア",
    item_id: null,
    skill: { ...sampleCatalog.skills[0], multiplier: 2, amount: 3 },
  };
  expect(actionDamage(10, action, "a", "a")).toBe(23);
  expect(actionDamage(10, action, "b", "a")).toBe(10);
  expect(
    actionDamage(
      10,
      { ...action, skill: { ...action.skill, target: "all_enemies" } },
      "b",
      "a",
    ),
  ).toBe(23);
  expect(
    actionDamage(10, { ...action, skill: sampleCatalog.skills[1] }, "a", "a"),
  ).toBe(10);
  expect(actionDamage(10, null, "a", "a")).toBe(10);
});

it("ticks poison separately from stats only during its active turns", () => {
  const skill: SkillDefinition = normalizeSkill({
    ...sampleCatalog.skills[0],
    effect: "ailment",
    amount_mode: "percent",
    amount: 10,
  });
  const e = { skill, target_id: "enemy", starts_turn: 1, expires_turn: 3 };
  expect(poisonDamage(50, { turn: 0, effects: [e] }, "enemy")).toBe(0);
  expect(poisonDamage(50, { turn: 1, effects: [e, e] }, "enemy")).toBe(10);
  expect(poisonDamage(50, { turn: 3, effects: [e] }, "enemy")).toBe(0);
  expect(modifiedStat(20, { turn: 1, effects: [e] }, "enemy", "attack")).toBe(
    20,
  );
});

it("applies additive percentage changes against the original stat for their duration", () => {
  const skill: SkillDefinition = normalizeSkill({
    ...sampleCatalog.skills[0],
    effect: "buff",
    target: "self",
    stat: "attack",
    amount_mode: "percent",
    amount: 50,
  });
  const effect = {
    skill,
    target_id: "player",
    starts_turn: 1,
    expires_turn: 3,
  };
  expect(
    modifiedStat(10, { turn: 0, effects: [effect] }, "player", "attack"),
  ).toBe(10);
  expect(
    modifiedStat(
      10,
      { turn: 1, effects: [effect, effect] },
      "player",
      "attack",
    ),
  ).toBe(20);
  expect(
    modifiedStat(10, { turn: 1, effects: [effect] }, "player", "defense"),
  ).toBe(10);
  expect(
    modifiedStat(10, { turn: 3, effects: [effect] }, "player", "attack"),
  ).toBe(10);
  expect(effectAmount(skill, 35)).toBe(17);
});
