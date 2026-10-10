import type { GameSave } from "./domain";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";
export type GameState = { revision: number; save: GameSave };

export async function recoverGameState(): Promise<GameState> {
  const response = await fetch(`${API_BASE_URL}/game/state/recover`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body?.detail ?? "歩数を回復できませんでした。");
  return body;
}

export async function requestGameState(
  update?: GameState & { consume_access?: boolean },
): Promise<GameState> {
  const response = await fetch(`${API_BASE_URL}/game/state`, {
    method: update ? "PUT" : "GET",
    credentials: "include",
    cache: "no-store",
    ...(update
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        }
      : {}),
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body?.detail ?? "冒険状態を保存できませんでした。");
  return body;
}
