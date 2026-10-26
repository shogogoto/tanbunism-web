import type { SkillDefinition } from "./catalog";

/** Replacement keeps the binding's rate; removal drops its now-unused setting. */
export function rebindEffectChances(skill: SkillDefinition, ids: string[]) {
  const old =
    skill.template_ids ?? (skill.template_id ? [skill.template_id] : []);
  return Object.fromEntries(
    ids.flatMap((id, index) => {
      const previous = old.includes(id) ? id : old[index];
      const chance = skill.effect_chances?.[previous];
      return chance === undefined ? [] : [[id, chance]];
    }),
  );
}
