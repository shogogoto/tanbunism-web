import { networkFetch } from "~/shared/lib/networkFetch";
import { spriteAnimationLabels } from "./effectAssets";
import type { soundLabels } from "./soundAssets";

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
  effects?: Record<string, unknown>[];
  element?:
    | "none"
    | "fire"
    | "ice"
    | "lightning"
    | "water"
    | "wind"
    | "earth"
    | "light"
    | "dark"
    | "poison";
};
type InstantSkill = {
  stat?: never;
  duration_turns?: never;
  stack_limit?: never;
  ailment?: never;
};
type TimedSkill = {
  amount_mode?: "fixed" | "percent";
  duration_turns?: number;
  stack_limit?: number;
  multiplier?: never;
};
type WrongOverride = {
  amount_mode?: "fixed" | "percent";
  duration_turns?: number;
};
export type NumericWrongResult =
  | { type: "counter" | "fizzle" }
  | ({ type: "reduced"; amount: number; multiplier?: number } & WrongOverride);
export type AttackWrongResult =
  | { type: "counter" | "fizzle" }
  | ({ type: "reduced"; amount: number; multiplier: number } & WrongOverride);
export type AilmentWrongResult =
  | { type: "counter" | "fizzle" }
  | { type: "reduced"; apply: boolean; duration_turns?: number };
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
        stat?:
          | "attack"
          | "defense"
          | "specialAttack"
          | "specialDefense"
          | "maxHp";
        ailment?: never;
        on_wrong?: NumericWrongResult;
      })
    | (TimedSkill & {
        effect: "debuff";
        stat?: "attack" | "defense" | "specialAttack" | "specialDefense";
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
    stat: "attack" | "defense" | "specialAttack" | "specialDefense" | "maxHp";
    duration_turns: number;
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
    ...(effects?.length ? { effects } : {}),
    ...(element ? { element } : {}),
  };
  const numeric = { amount_mode: skill.amount_mode ?? "fixed" };
  const timed = {
    ...numeric,
    duration_turns: skill.duration_turns ?? 3,
    stack_limit: skill.stack_limit ?? 1,
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
        stat: skill.stat === "maxHp" ? "attack" : (skill.stat ?? "attack"),
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
      | "effects"
      | "element"
      | "animation"
      | "sound"
      | "mp_cost"
      | "target"
    > & { target?: SkillBase["target"] }
  : never;
export type SkillTemplate = TemplateOf<SkillDefinition>;

export function skillTemplate(skill: SkillDefinition): SkillTemplate {
  const {
    icon,
    enabled,
    template_id,
    template_ids,
    effects,
    element,
    animation,
    sound,
    mp_cost,
    target,
    ...values
  } = normalizeSkill(skill);
  return values;
}

export function resolveCatalogTemplates(catalog: GameCatalog): GameCatalog {
  return {
    ...catalog,
    skills: catalog.skills.map((skill) => {
      const ids = skill.template_ids?.length
        ? skill.template_ids
        : skill.template_id
          ? [skill.template_id]
          : [];
      const selected = ids.map((id) =>
        catalog.skill_templates?.find((t) => t.id === id),
      );
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
        effects: skill.template_ids?.length
          ? selected
              .filter((t) => t !== undefined)
              .map(({ id, name, ...effect }) => effect)
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
  const templates = [...(catalog.skill_templates ?? [])];
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

export type ItemDefinition = {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  skill_id: string;
  kind: "weapon" | "consumable";
  max_uses?: number;
};
export type ShopListing = { item_id: string; price: number; enabled: boolean };
export type EnemyDefinition = {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  boss: boolean;
  speed?: number | null;
  attack_skill_id: string | null;
  on_hit_skill_id?: string | null;
};
export type GameCatalog = {
  skills: SkillDefinition[];
  skill_templates?: SkillTemplate[];
  items: ItemDefinition[];
  shop?: ShopListing[];
  enemies: EnemyDefinition[];
  player_skills?: { skill_id: string; enabled: boolean }[];
  specialty_skills?: SpecialtySkillUse[];
  triggers?: {
    id: string;
    name: string;
    condition: GambitRule["condition"];
    threshold: number;
    enabled: boolean;
  }[];
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
    | "mp_below"
    | "enemy_count"
    | "buff_present"
    | "buff_absent"
    | "poisoned";
  threshold: number;
  action: "skill" | "item" | "specialty";
  definition_id: string;
  trigger_id?: string | null;
  target?: "self" | "enemy" | null;
};
export type BattleAction = {
  skill: SkillDefinition;
  item_id: string | null;
  item_max_uses?: number;
  name: string;
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
            body: JSON.stringify(value),
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
  return response.json();
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
  expires_turn: number;
};
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
        e.starts_turn <= (battle?.turn ?? 0) &&
        (battle?.turn ?? 0) < e.expires_turn,
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
          e.starts_turn <= (battle?.turn ?? 0) &&
          (battle?.turn ?? 0) < e.expires_turn,
      )
      .reduce((sum, e) => sum + effectAmount(e.skill, maximumHp), 0),
  );
}
