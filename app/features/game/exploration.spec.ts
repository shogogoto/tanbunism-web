import { describe, expect, it } from "vitest";
import { enterDungeon, move, newSave, resumeEvent } from "./domain";
import {
  ENTRANCE,
  dungeonMap,
  explore,
  neighbours,
  parkDungeon,
} from "./exploration";

const start = () => enterDungeon(newSave(), "book", "本", 1);
const step = (save: ReturnType<typeof start>, id: string) =>
  move(explore(save, id, "detour"), id, 0.9);

describe("persistent exploration", () => {
  it("travels to any discovered place for one move without adding roads or achievement", () => {
    const save = step(step(step(start(), "a"), "b"), "c");
    const visited = step(save, "a");
    expect(visited.maps?.book.current).toBe("a");
    expect(visited.run?.moves).toBe(4);
    expect(visited.maps?.book.places).toEqual(save.maps?.book.places);
    expect(visited.maps?.book.edges).toEqual(save.maps?.book.edges);
    const entrance = step(visited, ENTRANCE);
    expect(entrance.maps?.book.current).toBe(ENTRANCE);
    expect(entrance.run?.moves).toBe(5);
    expect(entrance.run?.phase).toBe("rest");
    expect(entrance.maps?.book.edges).toEqual(save.maps?.book.edges);
  });
  it("backtracks for one move without counting a new place or changing its region", () => {
    let save = step(step(start(), "a"), "b");
    if (!save.run) throw new Error("No run");
    expect(neighbours(dungeonMap(save, save.run))).toEqual(["a"]);
    save = step(save, "a");
    expect(save.run?.moves).toBe(3);
    expect(save.maps?.book.current).toBe("a");
    expect(save.maps?.book.places).toEqual([
      { id: "a", region: 0 },
      { id: "b", region: 0 },
    ]);
    expect(save.maps?.book.edges).toHaveLength(2);
    expect(explore(save, ENTRANCE, "detour")).not.toBe(save);
    expect(explore(save, "a", "detour")).toBe(save);
  });
  it("keeps branching paths and freezes each five-place achievement band", () => {
    let save = start();
    for (const id of ["a", "b", "c", "d", "e"]) save = step(save, id);
    save = step(resumeEvent(save), "f");
    expect(save.maps?.book.places.at(-1)).toEqual({ id: "f", region: 1 });
    save = step(save, "e");
    save = step(save, "branch");
    expect(save.maps?.book.edges).toContainEqual({
      from: "e",
      to: "branch",
      kind: "detour",
    });
    expect(save.maps?.book.places.find((p) => p.id === "e")?.region).toBe(0);
  });
  it("parks per-dungeon HP/content and restores it without healing or consuming moves", () => {
    let save = step(start(), "a");
    if (!save.run) throw new Error("No run");
    save = {
      ...save,
      run: { ...save.run, hp: 24 },
      content: { knowledge: [], quizzes: [] },
    };
    const parked = parkDungeon(save);
    expect(parked.run).toBeUndefined();
    let other = enterDungeon(parked, "other", "別の本", 2);
    other = parkDungeon(other);
    const restored = enterDungeon(other, "book", "本", 99);
    expect(restored.run).toEqual(save.run);
    expect(restored.content).toEqual(save.content);
    expect(restored.maps?.book.current).toBe("a");
    expect(restored.dungeons?.book).toBeUndefined();
    expect(restored.dungeons?.other).toBeDefined();
  });
  it("does not allow switching away from battle or feedback", () => {
    const battle = move(explore(start(), "a", "detour"), "a", 0.1);
    expect(parkDungeon(battle)).toBe(battle);
    const feedback = { ...start(), battleFeedback: "敵を倒した！" };
    expect(parkDungeon(feedback)).toBe(feedback);
  });
  it("migrates old routes as detours and keeps their last location", () => {
    let save = start();
    save = move(move(save, "c", 0.9), "a", 0.9);
    if (!save.run) throw new Error("No run");
    expect(dungeonMap(save, save.run)).toEqual({
      current: "a",
      places: [
        { id: "c", region: 0 },
        { id: "a", region: 0 },
      ],
      edges: [
        { from: ENTRANCE, to: "c", kind: "detour" },
        { from: "c", to: "a", kind: "detour" },
      ],
    });
  });
});
