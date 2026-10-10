const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";
export type { GameBalance as BattleSettings } from "~/features/game/battle";
import type { GameBalance as BattleSettings } from "~/features/game/battle";
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
  if (!response.ok) throw new Error("戦闘設定を操作できませんでした。");
  return response.json();
}
