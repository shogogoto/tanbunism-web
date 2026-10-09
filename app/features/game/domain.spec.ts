import { describe, expect, it } from "vitest";
import { answer, enterDungeon, move, newSave, resumeEvent } from "./domain";

const entered = () => enterDungeon(newSave(), "resource", "本", 1);
describe("adventure rules", () => {
  it("derives player stats from user Lv, leaving permission to the server", () => {
    const save = entered();
    expect(save.run?.hp).toBe(35);
    expect(enterDungeon(save, "other", "別の本", 99)).toBe(save);
  });
  it("ends at five moves but finishes a final encounter first", () => {
    let save = entered();
    for (let index = 0; index < 4; index++) save = move(save, `s${index}`, 0.9);
    save = move(save, "s4", 0.1);
    expect(save.run?.phase).toBe("battle");
    expect(move(save, "s5", 0.9)).toBe(save);
    save = answer(answer(save, true), true);
    expect(save.run?.phase).toBe("rest");
    expect(save.run?.moves).toBe(5);
    const resumed = resumeEvent(save);
    expect(resumed.run?.phase).toBe("path");
    expect(resumed.run?.moves).toBe(0);
    expect(resumed.run?.kills).toBe(1);
    expect(resumed.run?.readIds).toEqual(["s0", "s1", "s2", "s3", "s4"]);
  });
  it("wrong answers damage the player, and resuming never heals", () => {
    let save = answer(move(entered(), "s", 0.1), false);
    expect(save.run?.hp).toBe(24);
    expect(save.run?.enemyHp).toBe(20);
    if (!save.run) throw new Error("Expected an active run");
    save = { ...save, run: { ...save.run, phase: "rest" } };
    expect(resumeEvent(save).run?.hp).toBe(24);
  });
  it("three defeated enemies count one lap, not resource XP", () => {
    let save = entered();
    for (let index = 0; index < 3; index++)
      save = answer(answer(move(save, `s${index}`, 0.1), true), true);
    expect(save.run?.phase).toBe("cleared");
    expect(save.clears.resource).toBe(1);
    expect(answer(save, true)).toBe(save);
    expect(move(save, "s3", 0.1)).toBe(save);
  });
  it("defeat stops combat and repeated knowledge cannot advance again", () => {
    let save = move(entered(), "s", 0.1);
    for (let index = 0; index < 4; index++) save = answer(save, false);
    expect(save.run?.phase).toBe("defeated");
    expect(save.run?.hp).toBe(0);
    expect(answer(save, true)).toBe(save);
    const peaceful = move(entered(), "s", 0.9);
    expect(move(peaceful, "s", 0.9)).toBe(peaceful);
  });
});
