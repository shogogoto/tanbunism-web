import type { GambitRule, SkillDefinition } from "./catalog";

export function isStateSkill(skill: SkillDefinition) {
  return (skill.effects?.length ? skill.effects : [skill]).some(
    (effect) =>
      effect.effect === "buff" ||
      effect.effect === "debuff" ||
      effect.effect === "ailment",
  );
}

export const stateLabels = {
  buff: "バフ",
  debuff: "デバフ",
  poison: "毒",
  curse: "呪い",
  regen: "HP継続回復",
  refresh: "MP継続回復",
};

export function stateCondition(
  rule: Pick<
    GambitRule,
    "condition" | "state_kind" | "state_present" | "state_skill_id"
  >,
) {
  return {
    state_skill_id: rule.state_skill_id ?? null,
    state_kind:
      rule.condition === "poisoned"
        ? "poison"
        : rule.condition.startsWith("buff_")
          ? "buff"
          : (rule.state_kind ?? "buff"),
    state_present:
      rule.condition === "buff_absent" ? false : (rule.state_present ?? true),
  } as const;
}

export function conditionGroup(condition: GambitRule["condition"]) {
  if (condition.startsWith("hp_")) return "hp";
  if (condition.startsWith("mp_")) return "mp";
  if (["buff_present", "buff_absent", "poisoned", "state"].includes(condition))
    return "state";
  return condition;
}

export function hasThreshold(condition: GambitRule["condition"]) {
  return [
    "hp_below",
    "hp_above",
    "mp_below",
    "mp_above",
    "enemy_count",
  ].includes(condition);
}
