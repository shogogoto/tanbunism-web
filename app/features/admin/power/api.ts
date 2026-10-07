import type { PowerWeights } from "~/features/gamification/PowerBreakdown";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export async function requestPowerWeights(
  weights?: PowerWeights,
): Promise<PowerWeights> {
  const response = await fetch(
    `${API_BASE_URL}/admin/settings/resource-power`,
    {
      credentials: "include",
      ...(weights && {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weights),
      }),
    },
  );
  if (!response.ok) throw new Error("Power設定を操作できませんでした。");
  return response.json();
}
