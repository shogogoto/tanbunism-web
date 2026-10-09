import { beforeEach, expect, it } from "vitest";
import { enterDungeon, newSave } from "./domain";
import { gameSaveKey, readGameSave, writeGameSave } from "./storage";

beforeEach(() => localStorage.clear());
it("restores the run only for the same account", () => {
  const save = enterDungeon(newSave(), "resource", "本", 3, 1000);
  writeGameSave("user-1", save);
  expect(readGameSave("user1")).toEqual(save);
  expect(readGameSave("user-2")).toEqual(newSave());
});
it("recovers from corrupted or unsupported saves", () => {
  for (const raw of [
    "broken",
    '{"version":9}',
    JSON.stringify({ ...newSave(), run: {} }),
  ]) {
    localStorage.setItem(gameSaveKey("user"), raw);
    expect(readGameSave("user")).toEqual(newSave());
  }
});
