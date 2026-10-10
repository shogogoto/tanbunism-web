import type { RegionEnemy } from "./api";
import type { GameState } from "./state";

export type Allocation = {
  hp: number;
  attack: number;
  defense: number;
  seconds: number;
};
export const emptyAllocation: Allocation = {
  hp: 0,
  attack: 0,
  defense: 0,
  seconds: 0,
};
export const defaultBalance = {
  base_hp: 35,
  base_attack: 10,
  base_defense: 1,
  base_seconds: 45,
  hp_per_point: 5,
  attack_per_point: 2,
  defense_per_point: 1,
  seconds_per_point: 3,
  enemy_hp: 20,
  enemy_attack: 12,
  power_hp: 1,
  power_attack: 0.5,
  relation_hp: 1,
  relation_attack: 0.3,
  relation_cap: 30,
  region_hp: 5,
  region_attack: 2,
  enemy_types: 3,
  min_quizzes_per_enemy: 1,
  max_quizzes_per_enemy: 100,
  min_enemies: 1,
  max_encounter_enemies: 3,
};
export type GameBalance = typeof defaultBalance;
export type LiveEnemy = RegionEnemy & {
  hp: number;
  attack: number;
  region: number;
  relations: number;
};
export type CombatContext = { balance: GameBalance; enemies: LiveEnemy[] };
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
};

export function playerStats(
  allocation: Allocation | undefined,
  balance: GameBalance,
) {
  const a = allocation ?? emptyAllocation;
  return {
    maxHp: Math.min(100000, balance.base_hp + a.hp * balance.hp_per_point),
    attack: Math.min(
      100000,
      balance.base_attack + a.attack * balance.attack_per_point,
    ),
    defense: Math.min(
      100000,
      balance.base_defense + a.defense * balance.defense_per_point,
    ),
    answerSeconds: Math.min(
      1500,
      balance.base_seconds + a.seconds * balance.seconds_per_point,
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
  const response = await fetch(`${API_BASE_URL}/game/${path}`, {
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
    throw new Error(result.detail ?? "ゲーム状態を更新できませんでした。");
  return result;
}
