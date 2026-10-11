const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";
export type { GameBalance as BattleSettings } from "~/features/game/battle";
import type { GameBalance as BattleSettings } from "~/features/game/battle";

export type EnemyBalanceSimulation = {
  power: number;
  achievement: number;
  pool_quiz_count: number;
  average_relations: number;
  balance: BattleSettings;
  min_encounter_enemies: number;
  max_encounter_enemies: number;
  enemies: {
    index: number;
    quiz_count: number;
    hp: number;
    attack: number;
    relations: number;
  }[];
};

export async function requestEnemyBalanceSimulation(input: {
  balance: BattleSettings;
  power: number;
  achievement: number;
  average_relations: number;
}): Promise<EnemyBalanceSimulation> {
  return requestSimulation("simulate", input, "敵を試算できませんでした。");
}

export type CombatSimulationInput = {
  player: { hp: number; attack: number; defense: number };
  enemy: { hp: number; attack: number };
};
export type CombatSimulationResult = CombatSimulationInput & {
  damage_to_enemy: number;
  damage_to_player: number;
  correct_answers_to_defeat: number | null;
  incorrect_answers_to_defeat: number;
};
export function requestCombatSimulation(
  input: CombatSimulationInput,
): Promise<CombatSimulationResult> {
  return requestSimulation(
    "simulate-combat",
    input,
    "戦闘を試算できませんでした。",
  );
}

async function requestSimulation<T>(
  path: string,
  input: unknown,
  fallback: string,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}/admin/settings/game-balance/${path}`,
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      | { detail?: string }
      | undefined;
    throw new Error(typeof body?.detail === "string" ? body.detail : fallback);
  }
  return response.json();
}

export async function requestBattleSettings(
  settings?: BattleSettings,
): Promise<BattleSettings> {
  const response = await fetch(`${API_BASE_URL}/admin/settings/game-balance`, {
    credentials: "include",
    cache: "no-store",
    ...(settings && {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }),
  });
  if (!response.ok) throw new Error("ゲーム設定を操作できませんでした。");
  return response.json();
}
