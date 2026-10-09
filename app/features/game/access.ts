import { useEffect } from "react";
import useSWR from "swr";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export type AdventureAccess = {
  available: boolean;
  server_now: number;
  next_available_at: number;
};
export type TimedAdventureAccess = AdventureAccess & { receivedAt: number };
export const adventureAccessKey = (userId: string) => [
  "game-access",
  userId.replaceAll("-", "").toLowerCase(),
];

async function requestAccess(consume = false): Promise<TimedAdventureAccess> {
  const response = await fetch(
    `${API_BASE_URL}/game/adventure-access${consume ? "/consume" : ""}`,
    {
      method: consume ? "POST" : "GET",
      credentials: "include",
      cache: "no-store",
    },
  );
  const body = await response.json().catch(() => undefined);
  if (!response.ok)
    throw new Error(body?.detail ?? "冒険権を取得できませんでした。");
  if (
    typeof body?.available !== "boolean" ||
    !Number.isFinite(body?.server_now) ||
    !Number.isFinite(body?.next_available_at)
  )
    throw new Error("冒険権の応答を確認できませんでした。");
  return { ...body, receivedAt: Date.now() };
}

export const consumeAdventureAccess = () => requestAccess(true);

export function useAdventureAccess(userId: string) {
  const access = useSWR(adventureAccessKey(userId), () => requestAccess(), {
    refreshInterval: 15_000,
    dedupingInterval: 1000,
    revalidateOnFocus: true,
  });
  const { data, mutate } = access;
  useEffect(() => {
    if (!data || data.available) return;
    const delay = data.next_available_at - data.server_now;
    const timer = setTimeout(
      () => void mutate().catch(() => undefined),
      Math.max(0, delay - (Date.now() - data.receivedAt)),
    );
    return () => clearTimeout(timer);
  }, [data, mutate]);
  return access;
}
