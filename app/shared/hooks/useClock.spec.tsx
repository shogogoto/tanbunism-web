import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useClock } from "./useClock";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
});
afterEach(() => vi.useRealTimers());

it("samples time only while running and resumes from actual wall time", () => {
  const { result, rerender, unmount } = renderHook(
    ({ running }) => useClock(running),
    { initialProps: { running: true } },
  );
  act(() => vi.advanceTimersByTime(500));
  expect(result.current.now).toBe(1500);
  rerender({ running: false });
  expect(vi.getTimerCount()).toBe(0);
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current.now).toBe(1500);
  rerender({ running: true });
  expect(result.current.now).toBe(2500);
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it("supports explicit refresh without installing a timer", () => {
  const { result } = renderHook(() => useClock(false));
  vi.setSystemTime(9000);
  act(() => result.current.refresh());
  expect(result.current.now).toBe(9000);
  expect(vi.getTimerCount()).toBe(0);
});
