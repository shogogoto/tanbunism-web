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

export const sampleVariantSetCatalog: GameCatalog = {
  ...sampleTemplateCatalog,
  variant_sets: [
    {
      id: "tier",
      name: "威力段階",
      field: "multiplier",
      values: [
        { id: "low", name: "初級", value: 1.2 },
        { id: "mid", name: "中級", value: 1.8 },
        { id: "high", name: "上級", value: 2.5 },
      ],
    },
    {
      id: "range",
      name: "対象範囲",
      field: "target_count",
      values: [
        { id: "single", name: "単体", value: 1 },
        { id: "area", name: "範囲", value: 3 },
        { id: "wide", name: "広域", value: 5 },
        { id: "all", name: "全体", value: "all" },
      ],
    },
  ],
  skill_templates: sampleTemplateCatalog.skill_templates?.map((t) => ({
    ...t,
    name: "魔法攻撃",
    variant_set_ids: ["tier", "range"],
  })),
};
