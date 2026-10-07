const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export type LevelSettings = { level_xp_coefficient: number };

export async function requestLevelSettings(
  settings?: LevelSettings,
): Promise<LevelSettings> {
  const response = await fetch(`${API_BASE_URL}/admin/settings/gamification`, {
    credentials: "include",
    ...(settings && {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }),
  });
  if (!response.ok) throw new Error("レベル設定を操作できませんでした。");
  return response.json();
}
