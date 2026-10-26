import { apiErrorMessage } from "~/shared/lib/apiErrorMessage";
import { networkFetch } from "~/shared/lib/networkFetch";
import type { RegionEnemy } from "./api";
import type { GameState } from "./state";

export type Allocation = {
  hp: number;
  mp?: number;
  attack: number;
  defense: number;
  specialAttack?: number;
  specialDefense?: number;
  speed?: number;
};
export const emptyAllocation: Allocation = {
  hp: 0,
  mp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};
export const defaultBalance = {
  weakness_multiplier: 1.5,
  resistance_multiplier: 0.5,
  gambit_levels_per_slot: 5,
  specialty_levels_per_slot: 20,
  base_hp: 35,
  chest_gold: 30,
  chest_healing_potions: 0,
  chest_step_potions: 1,
  base_mp: 10,
  base_attack: 10,
  base_defense: 1,
  base_special_attack: 10,
  base_special_defense: 1,
  special_attack_per_point: 2,
  special_defense_per_point: 1,
  base_speed: 10,
  speed_per_point: 1,
  enemy_speed: 10,
  power_speed: 0,
  region_speed_growth_percent: 0,
  speed_formula: "sqrt" as "linear" | "sqrt",
  base_seconds: 45,
  hp_per_point: 5,
  mp_per_point: 2,
  skill_mp_cost: 3,
  skill_term_attack: 4,
  attack_per_point: 2,
  defense_per_point: 1,
  enemy_hp: 20,
  enemy_attack: 12,
  enemy_defense: 0,
  power_formula: "sqrt" as "log" | "sqrt",
  power_reference: 1,
  power_defense: 0.1,
  region_defense_growth_percent: 20,
  enemy_mp: 10,
  enemy_special_attack: 12,
  enemy_special_defense: 0,
  power_mp: 0,
  power_special_attack: 0.5,
  power_special_defense: 0,
  region_mp_growth_percent: 0,
  region_special_attack_growth_percent: 20,
  region_special_defense_growth_percent: 0,
  power_hp: 1,
  power_attack: 0.5,
  relation_hp: 1,
  relation_attack: 0.3,
  relation_cap: 30,
  region_hp: 5,
  region_attack: 2,
  region_hp_growth_percent: 20,
  region_attack_growth_percent: 20,
  enemy_variance_percent: 10,
  damage_attack_multiplier: 1,
  damage_defense_divisor: 2,
  damage_variance_percent: 20,
  battle_tempo_slow_seconds: 3,
  battle_tempo_medium_seconds: 1,
  battle_tempo_fast_seconds: 0.5,
  damage_effect_threshold_1: -50,
  damage_effect_threshold_2: 50,
  damage_effect_threshold_3: 75,
  damage_effect_label_1: "かすり",
  damage_effect_label_2: "HIT",
  damage_effect_label_3: "NICE!",
  damage_effect_label_4: "会心!",
  enemy_types: 3,
  enemy_types_per_region: 1,
  quizzes_per_enemy_coefficient: 1,
  encounter_growth_rate: 0.2,
  min_quizzes_per_enemy: 1,
  max_quizzes_per_enemy: 100,
  min_enemies: 1,
  max_encounter_enemies: 3,
  max_encounter_enemies_per_region: 0,
};
export type GameBalance = typeof defaultBalance;
export type LiveEnemy = RegionEnemy & {
  hp: number;
  attack: number;
  mp?: number;
  special_attack?: number | null;
  special_defense?: number;
  region: number;
  relations: number;
  speed?: number;
  animation?: import("./catalog").SkillAnimation;
  sound?: import("./catalog").SkillSound;
  weaknesses?: string[];
  resistances?: string[];
};
export type CombatContext = {
  balance: GameBalance;
  enemies: LiveEnemy[];
  elements?: import("./catalog").ElementDefinition[];
};
export type TurnInput = {
  battle_id: string;
  turn: number;
  answers: Record<string, string[]>;
  defeated: string[];
  retreat: boolean;
};
export type TurnResult = {
  state: GameState;
  results: Record<string, boolean>;
  damage: number;
  player_poison_damage?: number;
  curse_damage?: number;
  incoming_damage?: Record<string, number>;
  gold_earned?: number;
  poison_damage?: Record<string, number>;
  outgoing_damage?: Record<string, number>;
  enemy_hp?: Record<string, number>;
  enemy_mp?: Record<string, number>;
  actor_id?: string;
  quiz_enemy_id?: string;
};

export function rollPlayerDamage(
  attack: number,
  balance: GameBalance,
  random: () => number = Math.random,
): number {
  const nominal = Math.max(
    attack === 0 ? 0 : 1,
    Math.floor(attack * balance.damage_attack_multiplier),
  );
  if (nominal === 0) return 0;
  const spread = balance.damage_variance_percent / 100;
  const minimum = Math.max(1, Math.floor(nominal * (1 - spread)));
  const maximum = Math.max(1, Math.floor(nominal * (1 + spread)));
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

export type BattleTransport = <T>(
  path: string,
  body?: unknown,
  method?: string,
) => Promise<T>;

export function damageEffect(
  damage: number,
  attack: number,
  balance: GameBalance,
  nominalDamage?: number,
) {
  const settings = { ...defaultBalance, ...balance };
  const nominal = Math.max(
    1,
    nominalDamage ?? Math.floor(attack * settings.damage_attack_multiplier),
  );
  const spread = settings.damage_variance_percent / 100;
  const position =
    spread === 0
      ? 0
      : Math.max(-100, Math.min(100, ((damage / nominal - 1) / spread) * 100));
  // Round away floating-point noise at the configured boundaries.
  const normalized = Math.round(position * 1e6) / 1e6;
  const level =
    spread === 0
      ? 1
      : normalized < settings.damage_effect_threshold_1
        ? 0
        : normalized < settings.damage_effect_threshold_2
          ? 1
          : normalized < settings.damage_effect_threshold_3
            ? 2
            : 3;
  const labels = [
    settings.damage_effect_label_1,
    settings.damage_effect_label_2,
    settings.damage_effect_label_3,
    settings.damage_effect_label_4,
  ];
  return { level, label: labels[level] };
}

export function playerStats(
  allocation: Allocation | undefined,
  balance: GameBalance,
  weaponAttack = 0,
) {
  const a = allocation ?? emptyAllocation;
  return {
    maxHp: Math.min(100000, balance.base_hp + a.hp * balance.hp_per_point),
    maxMp: Math.min(
      100000,
      (balance.base_mp ?? 10) + (a.mp ?? 0) * (balance.mp_per_point ?? 2),
    ),
    attack: Math.min(
      100000,
      balance.base_attack + a.attack * balance.attack_per_point + weaponAttack,
    ),
    defense: Math.min(
      100000,
      balance.base_defense + a.defense * balance.defense_per_point,
    ),
    answerSeconds: balance.base_seconds,
    specialAttack: Math.min(
      100000,
      (balance.base_special_attack ?? 10) +
        (a.specialAttack ?? 0) * (balance.special_attack_per_point ?? 2),
    ),
    specialDefense: Math.min(
      100000,
      (balance.base_special_defense ?? 1) +
        (a.specialDefense ?? 0) * (balance.special_defense_per_point ?? 1),
    ),
    speed: Math.min(
      100000,
      (balance.base_speed ?? 10) +
        (a.speed ?? 0) * (balance.speed_per_point ?? 1),
    ),
  };
}

/** No enemy HP is sent to the server. A max-HP change never heals a damaged enemy. */
export function remainingHp(hp: Record<string, number>, enemies: LiveEnemy[]) {
  return Object.fromEntries(
    enemies.map((enemy) => [
      enemy.id,
      Math.min(hp[enemy.id] ?? enemy.hp, enemy.hp),
    ]),
  );
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";
export async function gameRequest<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const response = await networkFetch(`${API_BASE_URL}/game/${path}`, {
    method: body === undefined && method === "POST" ? "GET" : method,
    credentials: "include",
    cache: "no-store",
    ...(body !== undefined && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      apiErrorMessage(result, "ゲーム状態を更新できませんでした。"),
    );
  return result;
}
