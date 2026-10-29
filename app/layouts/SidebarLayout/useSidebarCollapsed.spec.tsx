import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import useSidebarCollapsed, {
  sidebarCollapsedStorageKey,
} from "./useSidebarCollapsed";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.removeItem(sidebarCollapsedStorageKey);
});

it("defaults to expanded without writing over storage on mount", () => {
  const write = vi.spyOn(Storage.prototype, "setItem");
  const { result } = renderHook(useSidebarCollapsed);
  expect(result.current[0]).toBe(false);
  expect(write).not.toHaveBeenCalled();
});

it("persists collapse and expansion and restores both after remount", () => {
  const first = renderHook(useSidebarCollapsed);
  act(() => first.result.current[1]());
  expect(first.result.current[0]).toBe(true);
  expect(localStorage.getItem(sidebarCollapsedStorageKey)).toBe("true");
  first.unmount();
  const second = renderHook(useSidebarCollapsed);
  expect(second.result.current[0]).toBe(true);
  act(() => second.result.current[1]());
  expect(second.result.current[0]).toBe(false);
  expect(localStorage.getItem(sidebarCollapsedStorageKey)).toBe("false");
  second.unmount();
  expect(renderHook(useSidebarCollapsed).result.current[0]).toBe(false);
});

it("ignores invalid stored values", () => {
  localStorage.setItem(sidebarCollapsedStorageKey, "invalid");
  expect(renderHook(useSidebarCollapsed).result.current[0]).toBe(false);
});

it("keeps toggling when reading and writing storage are blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("Blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Blocked");
  });
  const { result } = renderHook(useSidebarCollapsed);
  expect(result.current[0]).toBe(false);
  act(() => result.current[1]());
  expect(result.current[0]).toBe(true);
  act(() => result.current[1]());
  expect(result.current[0]).toBe(false);
});

it("does not read browser storage during server rendering", () => {
  const read = vi.spyOn(Storage.prototype, "getItem");
  function Probe() {
    const [collapsed] = useSidebarCollapsed();
    return <span>{String(collapsed)}</span>;
  }
  expect(renderToString(<Probe />)).toBe("<span>false</span>");
  expect(read).not.toHaveBeenCalled();
});
