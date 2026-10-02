import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { SWRConfig } from "swr";
import { expect, it, vi } from "vitest";
import { usePersistentSWR } from "./useCache";

function FreshSWR({ children }: PropsWithChildren) {
  return (
    <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );
}

it("永続cacheを先に表示してからSWRの取得結果へ差し替える", async () => {
  let resolveFresh: (value: string) => void = () => undefined;
  const fetcher = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        resolveFresh = resolve;
      }),
  );
  const getCache = vi.fn().mockResolvedValue("cached");
  const setCache = vi.fn().mockResolvedValue(undefined);

  const { result } = renderHook(
    () =>
      usePersistentSWR("profile", fetcher, {
        cacheKey: "profile:user-1",
        getCache,
        setCache,
      }),
    { wrapper: FreshSWR },
  );

  await waitFor(() => expect(result.current.data).toBe("cached"));
  expect(result.current.isLoading).toBe(false);

  resolveFresh("fresh");

  await waitFor(() => expect(result.current.data).toBe("fresh"));
  expect(setCache).toHaveBeenCalledWith("profile:user-1", "fresh");
});
