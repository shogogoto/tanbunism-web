import type { GambitRule, SkillDefinition } from "./catalog";

export function isStateSkill(skill: SkillDefinition) {
  return (skill.effects?.length ? skill.effects : [skill]).some(
    (effect) =>
      effect.effect === "buff" ||
      effect.effect === "debuff" ||
      effect.effect === "ailment",
  );
}

export function stateCondition(
  rule: Pick<GambitRule, "condition" | "state_present" | "state_skill_id">,
) {
  return {
    state_skill_id: rule.state_skill_id ?? null,
    state_present: rule.state_present ?? true,
  } as const;
}

export function conditionGroup(condition: GambitRule["condition"]) {
  if (condition.startsWith("hp_")) return "hp";
  if (condition.startsWith("mp_")) return "mp";
  return condition;
}

export function hasThreshold(condition: GambitRule["condition"]) {
  return [
    "hp_below",
    "hp_above",
    "hp_equal",
    "mp_below",
    "mp_above",
    "mp_equal",
    "enemy_count",
  ].includes(condition);
}
