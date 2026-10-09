import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import {
  adventureAccessKey,
  consumeAdventureAccess,
  useAdventureAccess,
} from "./access";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("refreshes at the server clock boundary, even when the device clock differs", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T17:00:00Z"));
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          available: false,
          server_now: 37798000,
          next_available_at: 37800000,
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          available: true,
          server_now: 37800000,
          next_available_at: 39600000,
        }),
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );
  const { result } = renderHook(() => useAdventureAccess("user"), { wrapper });
  await act(async () => {});
  expect(result.current.data?.available).toBe(false);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1999);
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(result.current.data?.available).toBe(true);
});

it("consumes server permission with credentials and surfaces conflicts", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ detail: "使用済み" }), { status: 409 }),
    );
  vi.stubGlobal("fetch", fetcher);
  await expect(consumeAdventureAccess()).rejects.toThrow("使用済み");
  expect(fetcher).toHaveBeenCalledWith(
    expect.stringContaining("/game/adventure-access/consume"),
    expect.objectContaining({
      method: "POST",
      credentials: "include",
      cache: "no-store",
    }),
  );
  expect(adventureAccessKey("USER-1")).toEqual(adventureAccessKey("user1"));
});

it("fails closed on malformed permission responses", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
  await expect(consumeAdventureAccess()).rejects.toThrow(
    "冒険権の応答を確認できませんでした。",
  );
});
