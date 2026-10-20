import {
  type GameCatalog,
  type SkillDefinition,
  normalizeSkill,
  resolveCatalogTemplates,
  skillTemplate,
} from "./catalog";

/** Isolated examples for UI stories and tests, never used as live fallbacks. */
export const sampleCatalog = {
  skills: [
    {
      id: "fire",
      name: "ファイア",
      icon: "flame",
      enabled: true,
      effect: "attack",
      target: "enemy",
      amount: 0,
      multiplier: 1.5,
      mp_cost: 3,
    },
    {
      id: "heal",
      name: "ケアル",
      icon: "heart",
      enabled: true,
      effect: "heal_hp",
      target: "self",
      amount: 20,
      mp_cost: 3,
    },
    {
      id: "potion",
      name: "薬の回復",
      icon: "flask",
      enabled: true,
      effect: "heal_hp",
      target: "self",
      amount: 20,
      mp_cost: 0,
    },
  ],
  player_skills: [
    { skill_id: "fire", enabled: true },
    { skill_id: "heal", enabled: true },
  ],
  specialty_skills: [],
  items: [
    {
      id: "healing_potion",
      name: "回復薬",
      icon: "flask",
      enabled: true,
      skill_id: "potion",
      kind: "consumable",
    },
  ],
  shop: [{ item_id: "healing_potion", price: 30, enabled: true }],
  enemies: [
    {
      id: "ghost",
      name: "ゴースト",
      icon: "ghost",
      enabled: true,
      boss: false,
      attack_skill_id: null,
    },
  ],
} satisfies GameCatalog & {
  skills: [SkillDefinition, SkillDefinition, SkillDefinition];
};

export const sampleTemplateCatalog = resolveCatalogTemplates({
  ...sampleCatalog,
  skill_templates: [
    skillTemplate(
      normalizeSkill({
        ...sampleCatalog.skills[0],
        id: "basic_spell",
        name: "初級単体魔法",
        damage_type: "special",
      }),
    ),
  ],
  skills: [
    {
      ...sampleCatalog.skills[0],
      template_id: "basic_spell",
      element: "fire",
      animation: "fire",
    },
    ...sampleCatalog.skills.slice(1),
    normalizeSkill({
      ...sampleCatalog.skills[0],
      id: "thunder",
      name: "サンダー",
      template_id: "basic_spell",
      element: "lightning",
      animation: "lightning",
    }),
    normalizeSkill({
      ...sampleCatalog.skills[0],
      id: "normal_attack",
      name: "戦う",
      mp_cost: 0,
      multiplier: 1,
      animation: "impact",
      on_wrong: { type: "counter" },
    }),
  ],
});
