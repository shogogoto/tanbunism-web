import { networkFetch } from "~/shared/lib/networkFetch";
import { spriteAnimationLabels } from "./effectAssets";
import type { soundLabels } from "./soundAssets";
import {
  type TemplateOverride,
  resolveTemplateVariants,
} from "./templateVariants";
import { resolveTriggerVariantSets } from "./triggerVariants";

export { soundLabels } from "./soundAssets";

type SkillBase = {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  target: "enemy" | "all_enemies" | "self";
  amount: number;
  target_count?: number | "all";
  damage_type?: "physical" | "special";
  mp_cost: number;
  animation?: SkillAnimation;
  sound?: SkillSound;
  template_id?: string | null;
  template_ids?: string[];
  effect_chances?: Record<string, number>;
  effects?: Record<string, unknown>[];
  element?: string;
};
type InstantSkill = {
  affected_element?: never;
  stat?: never;
  duration_turns?: never;
  stack_limit?: never;
  ailment?: never;
};
type TimedSkill = {
  affected_element?: string | null;
  amount_mode?: "fixed" | "percent";
  duration_turns?: number | "infinite";
  stack_limit?: number;
  multiplier?: never;
};
type WrongOverride = {
  amount_mode?: "fixed" | "percent";
  duration_turns?: number | "infinite";
};
export type NumericWrongResult =
  | { type: "counter" | "fizzle" }
  | ({ type: "reduced"; amount: number; multiplier?: number } & WrongOverride);
export type AttackWrongResult =
  | { type: "counter" | "fizzle" }
  | ({ type: "reduced"; amount: number; multiplier: number } & WrongOverride);
export type AilmentWrongResult =
  | { type: "counter" | "fizzle" }
  | { type: "reduced"; apply: boolean; duration_turns?: number | "infinite" };
export const statusStatLabels = {
  maxHp: "HP",
  maxMp: "MP",
  attack: "攻撃力",
  defense: "守備力",
  specialAttack: "特攻",
  specialDefense: "特守",
  speed: "速さ",
  damageDealt: "属性威力",
  damageTaken: "属性耐性",
};
export type StatusStat = keyof typeof statusStatLabels;
export type SkillDefinition = SkillBase &
  (
    | (InstantSkill & {
        effect: "attack";
        multiplier: number;
        amount_mode?: "fixed" | "percent";
        damage_type?: "physical" | "special";
        target_count?: number | "all";
        on_wrong?: AttackWrongResult;
      })
    | (InstantSkill & {
        effect: "heal_hp" | "heal_mp" | "damage_mp";
        multiplier?: never;
        amount_mode?: "fixed" | "percent";
        on_wrong?: NumericWrongResult;
      })
    | (TimedSkill & {
        effect: "buff";
        stat?: StatusStat;
        ailment?: never;
        on_wrong?: NumericWrongResult;
      })
    | (TimedSkill & {
        effect: "debuff";
        stat?: StatusStat;
        ailment?: never;
        on_wrong?: NumericWrongResult;
        target_count?: number | "all";
      })
    | (TimedSkill & {
        effect: "ailment";
        ailment?: "poison" | "curse" | "regen" | "refresh";
        stat?: never;
        on_wrong?: AilmentWrongResult;
        target_count?: number | "all";
      })
    | (InstantSkill & {
        effect: "recover_moves" | "equip_attack";
        multiplier?: never;
        amount_mode?: never;
        on_wrong?: never;
      })
  );
export type SkillPatch = Partial<
  SkillBase & {
    effect: SkillDefinition["effect"];
    multiplier: number;
    amount_mode: "fixed" | "percent";
    stat: StatusStat;
    affected_element: string | null;
    duration_turns: number | "infinite";
    stack_limit: number;
    ailment: "poison" | "curse" | "regen" | "refresh";
    on_wrong: AttackWrongResult | NumericWrongResult | AilmentWrongResult;
    damage_type: "physical" | "special";
    target_count: number | "all";
  }
>;

/** Keep drafts and exports canonical even when the server still returns legacy flat data. */
export function normalizeSkill(
  skill: SkillBase & SkillPatch & { effect: SkillDefinition["effect"] },
): SkillDefinition {
  const {
    id,
    name,
    icon,
    enabled,
    target,
    amount,
    mp_cost,
    animation,
    sound,
    effect,
    template_id,
    template_ids,
    effect_chances,
    effects,
    element,
  } = skill;
  const common = {
    id,
    name,
    icon,
    enabled,
    target,
    amount,
    mp_cost,
    animation,
    sound,
    effect,
    target_count: skill.target_count ?? (target === "all_enemies" ? "all" : 1),
    damage_type: skill.damage_type ?? "physical",
    ...(template_id ? { template_id } : {}),
    ...(template_ids?.length ? { template_ids } : {}),
    ...(effect_chances && Object.keys(effect_chances).length
      ? { effect_chances }
      : {}),
    ...(effects?.length ? { effects } : {}),
    ...(element ? { element } : {}),
  };
  const numeric = { amount_mode: skill.amount_mode ?? "fixed" };
  const timed = {
    ...numeric,
    duration_turns: skill.duration_turns ?? 3,
    stack_limit: skill.stack_limit ?? 1,
    ...(["buff", "debuff"].includes(effect) &&
    ["damageDealt", "damageTaken"].includes(skill.stat ?? "")
      ? { affected_element: skill.affected_element }
      : {}),
  };
  const wrong = skill.on_wrong;
  const numericWrong: NumericWrongResult =
    wrong?.type === "reduced"
      ? {
          type: "reduced",
          amount: "amount" in wrong ? wrong.amount : 0,
          ...("amount_mode" in wrong && wrong.amount_mode !== undefined
            ? { amount_mode: wrong.amount_mode }
            : {}),
          ...((effect === "buff" || effect === "debuff") &&
          wrong.duration_turns !== undefined
            ? { duration_turns: wrong.duration_turns }
            : {}),
        }
      : { type: wrong?.type === "counter" ? "counter" : "fizzle" };
  switch (effect) {
    case "attack":
      return {
        ...common,
        effect,
        ...numeric,
        multiplier: skill.multiplier ?? 1,
        damage_type: skill.damage_type ?? "physical",
        target_count:
          skill.target_count ?? (target === "all_enemies" ? "all" : 1),
        on_wrong:
          wrong?.type === "reduced"
            ? {
                type: "reduced",
                amount: "amount" in wrong ? wrong.amount : 0,
                multiplier:
                  "multiplier" in wrong ? (wrong.multiplier ?? 0.5) : 0.5,
                ...("amount_mode" in wrong && wrong.amount_mode !== undefined
                  ? { amount_mode: wrong.amount_mode }
                  : {}),
              }
            : { type: wrong?.type === "counter" ? "counter" : "fizzle" },
      };
    case "heal_hp":
    case "heal_mp":
    case "damage_mp":
      return { ...common, effect, ...numeric, on_wrong: numericWrong };
    case "buff":
      return {
        ...common,
        effect,
        ...timed,
        stat: skill.stat ?? "attack",
        on_wrong: numericWrong,
      };
    case "debuff":
      return {
        ...common,
        effect,
        ...timed,
        stat: skill.stat ?? "attack",
        target_count:
          skill.target_count ?? (target === "all_enemies" ? "all" : 1),
        on_wrong: numericWrong,
      };
    case "ailment":
      return {
        ...common,
        effect,
        ...timed,
        ailment: skill.ailment ?? "poison",
        target_count:
          skill.target_count ?? (target === "all_enemies" ? "all" : 1),
        on_wrong:
          wrong?.type === "reduced"
            ? {
                type: "reduced",
                apply: "apply" in wrong ? wrong.apply : false,
                ...(wrong.duration_turns !== undefined
                  ? { duration_turns: wrong.duration_turns }
                  : {}),
              }
            : { type: wrong?.type === "counter" ? "counter" : "fizzle" },
      };
    case "recover_moves":
    case "equip_attack":
      return { ...common, effect };
  }
}
type TemplateOf<T> = T extends SkillDefinition
  ? Omit<
      T,
      | "icon"
      | "enabled"
      | "template_id"
      | "template_ids"
      | "effect_chances"
      | "effects"
      | "element"
      | "animation"
      | "sound"
      | "mp_cost"
      | "target"
    > & { target?: SkillBase["target"] }
  : never;
export type SkillTemplate = TemplateOf<SkillDefinition> & {
  base_template_id?: string | null;
  override_fields?: TemplateOverride[];
  variant_axis?: string | null;
  variant_label?: string | null;
  variant_set_ids?: string[];
  variant_selections?: import("./variantSets").VariantSelection[];
};

export function skillTemplate(
  skill: SkillDefinition,
  source?: SkillTemplate,
): SkillTemplate {
  const {
    icon,
    enabled,
    template_id,
    template_ids,
    effect_chances,
    effects,
    element,
    animation,
    sound,
    mp_cost,
    target,
    ...values
  } = normalizeSkill(
    skill.effect === "equip_attack"
      ? {
          ...skill,
          effect: "buff",
          stat: "attack",
          amount_mode: "fixed",
          duration_turns: "infinite",
          stack_limit: 1,
          on_wrong: { type: "fizzle" },
        }
      : skill,
  );
  return {
    ...values,
    ...(source?.variant_set_ids
      ? { variant_set_ids: source.variant_set_ids }
      : {}),
    ...(source?.variant_selections
      ? { variant_selections: source.variant_selections }
      : {}),
    ...(source?.variant_axis ? { variant_axis: source.variant_axis } : {}),
    ...(source?.variant_label ? { variant_label: source.variant_label } : {}),
    ...(source?.base_template_id
      ? {
          base_template_id: source.base_template_id,
          override_fields: source.override_fields ?? [],
        }
      : {}),
  };
}

export function resolveCatalogTemplates(catalog: GameCatalog): GameCatalog {
  const templates = resolveTemplateVariants(
    catalog.skill_templates ?? [],
    catalog.variant_sets ?? [],
  );
  return {
    ...catalog,
    ...(catalog.skill_templates ? { skill_templates: templates } : {}),
    skills: catalog.skills.map((skill) => {
      const ids = skill.template_ids?.length
        ? skill.template_ids
        : skill.template_id
          ? [skill.template_id]
          : [];
      const selected = ids.map((id) => templates.find((t) => t.id === id));
      const template = selected[0];
      if (!template) return skill;
      return normalizeSkill({
        ...template,
        target:
          template.effect === "ailment" &&
          ["regen", "refresh"].includes(template.ailment ?? "poison")
            ? "self"
            : ["attack", "damage_mp", "debuff", "ailment"].includes(
                  template.effect,
                )
              ? "enemy"
              : "self",
        id: skill.id,
        name: skill.name,
        icon: skill.icon,
        enabled: skill.enabled,
        mp_cost: skill.mp_cost,
        template_id: skill.template_ids?.length ? undefined : template.id,
        template_ids: skill.template_ids,
        effect_chances: skill.effect_chances,
        effects: skill.template_ids?.length
          ? selected
              .filter((t) => t !== undefined)
              .map(
                ({
                  id,
                  name,
                  base_template_id,
                  override_fields,
                  variant_axis,
                  variant_label,
                  variant_set_ids,
                  variant_selections,
                  ...effect
                }) => effect,
              )
          : undefined,
        element: skill.element,
        animation: skill.animation,
        sound: skill.sound,
      });
    }),
  };
}

/** Existing standalone effects become editable templates without changing their values. */
export function prepareSkillCatalog(catalog: GameCatalog): GameCatalog {
  const templates = (catalog.skill_templates ?? []).map((template) =>
    template.effect === "equip_attack"
      ? skillTemplate(
          normalizeSkill({
            ...template,
            icon: "sparkles",
            mp_cost: 0,
            enabled: true,
            target: "self",
          }),
        )
      : template,
  );
  const skills = catalog.skills.map((skill) => {
    let ids = skill.template_ids?.length
      ? skill.template_ids
      : skill.template_id
        ? [skill.template_id]
        : [];
    if (!ids.length) {
      let id = `effect_${skill.id}`.slice(0, 64);
      if (templates.some((template) => template.id === id))
        id = `effect_${crypto.randomUUID().replaceAll("-", "")}`;
      templates.push(
        skillTemplate({ ...skill, id, name: `${skill.name}の効果` }),
      );
      ids = [id];
    }
    return { ...skill, template_id: undefined, template_ids: ids };
  });
  return resolveCatalogTemplates({
    ...catalog,
    skills,
    skill_templates: templates,
  });
}

export const elementLabels = {
  none: "なし",
  fire: "炎",
  ice: "氷",
  lightning: "雷",
  water: "水",
  wind: "風",
  earth: "土",
  light: "光",
  dark: "闇",
  poison: "毒",
} as const;

export type ElementDefinition = {
  id: string;
  name: string;
  icon: string;
  color: string;
  enabled: boolean;
};
export const defaultElements: ElementDefinition[] = [
  ["fire", "炎", "flame", "#ef4444"],
  ["ice", "氷", "snowflake", "#38bdf8"],
  ["lightning", "雷", "zap", "#facc15"],
  ["water", "水", "droplet", "#3b82f6"],
  ["wind", "風", "leaf", "#22c55e"],
  ["earth", "土", "mountain", "#a16207"],
  ["light", "光", "sun", "#fde68a"],
  ["dark", "闇", "moon", "#a78bfa"],
].map(([id, name, icon, color]) => ({ id, name, icon, color, enabled: true }));

export type ItemDefinition = {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  skill_id: string;
  kind: "weapon" | "consumable";
  category?: import("./itemCategories").ItemCategory;
  max_uses?: number;
  equipment_part?: "arm" | "body" | "feet" | "head" | "accessory" | null;
};

export function isEquipmentSkill(skill: SkillDefinition): boolean {
  const effects = skill.effects?.length ? skill.effects : [skill];
  return effects.every(
    (effect) => effect.effect === "buff" || effect.effect === "equip_attack",
  );
}
export type ShopListing = (
  | { item_id: string }
  | { trigger_id: string; trigger_variant_id?: string | null }
) & {
  price: number;
  enabled: boolean;
};
export type EnemyDefinition = {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  boss: boolean;
  speed?: number | null;
  multipliers?: Partial<Record<EnemyStat, number>>;
  attack_skill_id: string | null;
  on_hit_skill_id?: string | null;
  gambits?: EnemyGambitRule[];
  weaknesses?: string[];
  resistances?: string[];
};
export type EnemyGambitRule = {
  trigger_id: string;
  trigger_variant_id?: string | null;
  skill_id: string;
  enabled: boolean;
};
export const enemyStatLabels = {
  hp: "HP",
  mp: "MP",
  attack: "攻撃力",
  defense: "守備力",
  special_attack: "特攻",
  special_defense: "特守",
  speed: "速さ",
};
export type EnemyStat = keyof typeof enemyStatLabels;
export type GameCatalog = {
  trigger_variant_sets?: TriggerVariantSet[];
  boss_multipliers_version?: 1;
  variant_sets?: import("./variantSets").VariantSet[];
  elements?: ElementDefinition[];
  skills: SkillDefinition[];
  skill_templates?: SkillTemplate[];
  items: ItemDefinition[];
  shop?: ShopListing[];
  enemies: EnemyDefinition[];
  player_skills?: { skill_id: string; enabled: boolean }[];
  specialty_skills?: SpecialtySkillUse[];
  triggers?: TriggerDefinition[];
};
export type TriggerTarget = "enemy" | "self" | "ally";
export type TriggerVariantField =
  | "target"
  | "condition"
  | "threshold"
  | "state_skill_id"
  | "state_present"
  | "stat"
  | "stat_basis"
  | "comparison";
export type TriggerVariant = {
  id: string;
  name: string;
  value?: string | number | boolean | null;
  field?: TriggerVariantField | null;
  child_field?: TriggerVariantField | null;
  base_variant_id?: string | null;
  variant_set_ids?: string[];
  variant_selections?: import("./variantCore").VariantSelection[];
  resolved_name?: string | null;
  resolved_values?: Partial<TriggerDefinition> | null;
  effective_set_ids?: string[];
};
export type TriggerVariantSet = {
  id: string;
  name: string;
  field: TriggerVariantField;
  values: { id: string; name: string; value: string | number | boolean }[];
};
export type TriggerDefinition = Pick<
  GambitRule,
  | "condition"
  | "threshold"
  | "state_present"
  | "state_skill_id"
  | "stat"
  | "stat_basis"
  | "comparison"
> & {
  id: string;
  name: string;
  enabled: boolean;
  target?: TriggerTarget | null;
  variant_field?: TriggerVariantField;
  variants?: TriggerVariant[];
  variant_set_id?: string | null;
  variant_set_ids?: string[];
};
export type SpecialtySkillUse = {
  skill_id: string;
  enabled: boolean;
  quiz_required: boolean;
  quiz_seconds: number;
  wrong_multiplier: number;
  power_coefficient: number;
};
export const animationLabels = {
  none: "なし",
  slash: "斬撃",
  impact: "打撃",
  fire: "炎",
  lightning: "雷",
  heal: "回復の光",
  ripple: "回復の波紋",
  buff: "上昇オーラ",
  debuff: "下降オーラ",
  poison: "毒の煙",
  ...spriteAnimationLabels,
} as const;
export type SkillAnimation = keyof typeof animationLabels;
export type SkillSound = keyof typeof soundLabels;
export type GambitRule = {
  enabled: boolean;
  condition:
    | "always"
    | "hp_below"
    | "hp_above"
    | "hp_equal"
    | "mp_below"
    | "mp_above"
    | "mp_equal"
    | "enemy_count"
    | "stat"
    | "state";
  threshold: number;
  stat?:
    | "hp"
    | "mp"
    | "attack"
    | "defense"
    | "special_attack"
    | "special_defense"
    | "speed";
  stat_basis?: "current" | "maximum" | "percent";
  comparison?: "above" | "below" | "equal" | "lowest" | "highest";
  state_present?: boolean;
  state_skill_id?: string | null;
  action: "skill" | "item" | "specialty";
  definition_id: string;
  trigger_id?: string | null;
  trigger_variant_id?: string | null;
  target?: TriggerTarget | null;
};
export type BattleAction = {
  trigger_name?: string | null;
  skill: SkillDefinition;
  item_id: string | null;
  item_max_uses?: number;
  name: string;
  target_ids?: string[] | null;
};
export const effectLabels: Record<SkillDefinition["effect"], string> = {
  attack: "攻撃",
  heal_hp: "HP回復",
  heal_mp: "MP回復",
  damage_mp: "MPダメージ",
  recover_moves: "歩数回復",
  equip_attack: "装備：攻撃力",
  buff: "buff：能力向上",
  debuff: "debuff：能力低下",
  ailment: "状態異常",
};
export async function requestGameCatalog(
  admin = false,
  value?: GameCatalog,
): Promise<GameCatalog> {
  const base =
    import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";
  const response = await networkFetch(
    `${base}/${admin ? "admin/game" : "game"}/catalog`,
    {
      credentials: "include",
      cache: "no-store",
      ...(value
        ? {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resolveTriggerVariantSets(value)),
          }
        : {}),
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string"
        ? body.detail
        : "ゲーム定義を読み書きできませんでした。",
    );
  }
  return resolveTriggerVariantSets(await response.json());
}

/** Only the selected attack action changes outgoing damage; answers still decide hits. */
export function actionDamage(
  damage: number,
  action: BattleAction | null | undefined,
  enemyId: string,
  firstEnemyId?: string,
  sourceAttack = damage,
) {
  if (
    !action ||
    action.skill.effect !== "attack" ||
    (action.skill.target === "enemy" && enemyId !== firstEnemyId)
  )
    return damage;
  return Math.min(
    100000,
    Math.max(
      1,
      Math.floor(damage * action.skill.multiplier) +
        effectAmount(action.skill, sourceAttack),
    ),
  );
}

export type BattleEffect = {
  skill: SkillDefinition;
  target_id: string;
  starts_turn: number;
  expires_turn: number | null;
};
export function battleEffectActive(effect: BattleEffect, turn: number) {
  return (
    effect.starts_turn <= turn &&
    (effect.expires_turn == null || turn < effect.expires_turn)
  );
}
export function effectAmount(skill: SkillDefinition, base: number) {
  return skill.amount_mode === "percent"
    ? Math.floor((base * skill.amount) / 100)
    : skill.amount;
}
export function modifiedStat(
  base: number,
  battle: { turn: number; effects?: BattleEffect[] } | null | undefined,
  target: string,
  stat: string,
) {
  const change = (battle?.effects ?? [])
    .filter(
      (e) =>
        e.target_id === target &&
        ["buff", "debuff"].includes(e.skill.effect) &&
        e.skill.stat === stat &&
        battleEffectActive(e, battle?.turn ?? 0),
    )
    .reduce(
      (sum, e) =>
        sum +
        effectAmount(e.skill, base) * (e.skill.effect === "buff" ? 1 : -1),
      0,
    );
  return Math.max(0, Math.min(100000, base + change));
}

export function poisonDamage(
  maximumHp: number,
  battle: { turn: number; effects?: BattleEffect[] } | null | undefined,
  target: string,
) {
  return Math.min(
    100000,
    (battle?.effects ?? [])
      .filter(
        (e) =>
          e.target_id === target &&
          e.skill.effect === "ailment" &&
          (e.skill.ailment ?? "poison") === "poison" &&
          battleEffectActive(e, battle?.turn ?? 0),
      )
      .reduce((sum, e) => sum + effectAmount(e.skill, maximumHp), 0),
  );
}
