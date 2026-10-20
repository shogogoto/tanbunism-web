import { networkFetch } from "~/shared/lib/networkFetch";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";
export type { GameBalance as BattleSettings } from "~/features/game/battle";
import type { GameBalance as BattleSettings } from "~/features/game/battle";
import { defaultBalance } from "~/features/game/battle";
import type {
  Allocation,
  CombatContext,
  TurnInput,
  TurnResult,
} from "~/features/game/battle";
import type { GameState } from "~/features/game/state";

export type PracticeInput = {
  user_id: string;
  player_user_id?: string;
  resource_id: string;
  level: number;
  balance: BattleSettings;
  allocation: Allocation | null;
  seed: number;
};
export type PracticeSession = {
  gambit_slots?: number;
  catalog?: import("~/features/game/catalog").GameCatalog;
  state: GameState;
  context: CombatContext;
  seed: number;
  server_now: number;
};
export const requestPractice = (
  input: PracticeInput,
): Promise<PracticeSession> =>
  requestSimulation(
    "practice",
    { ...input, scheduled: true },
    "模擬戦を準備できませんでした。",
  );
export const requestPracticeTurn = (
  session: PracticeSession,
  turn: TurnInput,
): Promise<TurnResult> =>
  requestSimulation(
    "practice/turn",
    { session, turn },
    "模擬戦を精算できませんでした。",
  );
export const requestPracticeNext = (
  session: PracticeSession,
): Promise<GameState> =>
  requestSimulation(
    "practice/next",
    session,
    "次の模擬ターンを開始できませんでした。",
  );

export const requestPracticeAction = <T>(
  session: PracticeSession,
  answer: boolean,
  body: unknown,
): Promise<T> =>
  requestSimulation(
    "practice/gambit",
    { session, answer, body },
    "模擬ガンビットを精算できませんでした。",
  );

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
    mp?: number;
    special_attack?: number | null;
    special_defense?: number;
    speed?: number;
    relations: number;
  }[];
  requested_enemy_types: number;
  requested_quiz_count: number;
  assigned_quiz_count: number;
  unassigned_quiz_count: number;
  warnings: string[];
};

export type SimulatedPracticeInput = {
  simulation: EnemyBalanceSimulation;
  balance: BattleSettings;
  seed: number;
  player_user_id?: string;
  allocation?: Allocation | null;
};

export type PracticeEnemyTrial = {
  id: string;
  name: string;
  simulation: EnemyBalanceSimulation;
};

export type EnemyConditions = { power: number; achievement: number };

export const requestSimulatedPractice = (
  input: SimulatedPracticeInput,
): Promise<PracticeSession> =>
  requestSimulation(
    "practice/simulation",
    { ...input, scheduled: true },
    "試算結果から模擬戦を準備できませんでした。",
  );

export async function requestEnemyBalanceSimulation(input: {
  balance: BattleSettings;
  power: number;
  achievement: number;
  average_relations: number;
}): Promise<EnemyBalanceSimulation> {
  return requestSimulation("simulate", input, "敵を試算できませんでした。");
}

async function requestSimulation<T>(
  path: string,
  input: unknown,
  fallback: string,
): Promise<T> {
  const response = await networkFetch(
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
    if (
      path.startsWith("practice") &&
      response.status === 404 &&
      body?.detail === "Not Found"
    ) {
      throw new Error(
        "模擬戦APIがサーバーに未反映です。バックエンドのデプロイ完了後に再度お試しください。",
      );
    }
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
  return { ...defaultBalance, ...(await response.json()) };
}
