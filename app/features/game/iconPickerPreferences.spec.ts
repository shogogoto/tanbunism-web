import { afterEach, expect, it, vi } from "vitest";
import {
  defaultIconFilters,
  iconFilterKey,
  readIconFilters,
  readRecentIcons,
  recentIconKey,
  rememberIcon,
  writeIconFilters,
} from "./iconPickerPreferences";

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.removeItem(iconFilterKey);
  localStorage.removeItem(recentIconKey);
});

it("keeps filters in the current browser tab and recent choices separately", () => {
  writeIconFilters({ query: "兜", category: "equipment", style: "pixel" });
  expect(readIconFilters()).toEqual({
    query: "兜",
    category: "equipment",
    style: "pixel",
  });
  expect(localStorage.getItem(iconFilterKey)).toBeNull();
  rememberIcon("crawl_leather_helm");
  expect(readRecentIcons()).toEqual(["crawl_leather_helm"]);
});

it("deduplicates recent choices, moves the latest to the front and keeps eight", () => {
  for (let i = 0; i < 10; i++) rememberIcon(`icon_${i}`);
  rememberIcon("icon_5");
  expect(readRecentIcons()).toEqual([
    "icon_5",
    "icon_9",
    "icon_8",
    "icon_7",
    "icon_6",
    "icon_4",
    "icon_3",
    "icon_2",
  ]);
});

it("rejects malformed storage and falls back when browser storage is unavailable", () => {
  sessionStorage.setItem(iconFilterKey, "{broken");
  localStorage.setItem(
    recentIconKey,
    JSON.stringify([null, "https://bad.example/icon", 7]),
  );
  expect(readIconFilters()).toEqual(defaultIconFilters);
  expect(readRecentIcons()).toEqual([]);
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(readIconFilters()).toEqual(defaultIconFilters);
  expect(() => writeIconFilters(defaultIconFilters)).not.toThrow();
  expect(rememberIcon("shield")).toEqual(["shield"]);
});
