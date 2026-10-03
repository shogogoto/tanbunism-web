import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { SWRConfig } from "swr";
import { beforeEach, expect, it, vi } from "vitest";
import { setItem } from "~/shared/lib/storage";
import { useQuizSWR } from "./useQuizSWR";

function FreshSWR({ children }: PropsWithChildren) {
  return (
    <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
  );
}

beforeEach(() => {
  localStorage.clear();
  setItem("auth-user", { status: 200, data: { uid: "user-1" } });
});

it("古いcacheを表示したまま最新値へ差し替える", async () => {
  let resolveFresh: (value: string) => void = () => undefined;
  const load = vi.fn(({ waitForRefresh } = {}) => {
    if (!waitForRefresh) return Promise.resolve("cached");
    return new Promise<string>((resolve) => {
      resolveFresh = resolve;
    });
  });

  const { result } = renderHook(() => useQuizSWR("quiz-list", load), {
    wrapper: FreshSWR,
  });

  await waitFor(() => expect(result.current.data).toBe("cached"));
  expect(result.current.isLoading).toBe(false);

  resolveFresh("fresh");

  await waitFor(() => expect(result.current.data).toBe("fresh"));
});
