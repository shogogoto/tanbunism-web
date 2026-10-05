import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { recommendationDay, useRecommendationDay } from "./recommendationDay";

afterEach(() => vi.useRealTimers());

it("日替わりの境界を日本時間の午前0時に合わせる", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-05T14:59:00Z"));
  expect(recommendationDay()).toBe("2026-10-05");
  vi.setSystemTime(new Date("2026-10-05T15:00:00Z"));
  expect(recommendationDay()).toBe("2026-10-06");
});

it("開いたままでも日付変更を検知する", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-05T14:59:30Z"));
  const { result } = renderHook(useRecommendationDay);
  expect(result.current).toBe("2026-10-05");
  act(() => vi.advanceTimersByTime(60_000));
  expect(result.current).toBe("2026-10-06");
});
