import { describe, expect, it } from "vitest";
import {
  answer,
  continueExploring,
  enterDungeon,
  move,
  newSave,
  resumeEvent,
} from "./domain";

const entered = () => enterDungeon(newSave(), "resource", "本", 1);
describe("adventure rules", () => {
  it("uses the fixed regional enemy attack rather than the player level", () => {
    const save = move(entered(), "s", 0.1);
    if (!save.run) throw new Error("Missing run");
    save.run.enemyId = "enemy";
    save.content = {
      knowledge: [],
      quizzes: [],
      regionEnemies: {
        2: [{ id: "enemy", name: "敵", quizIndex: 0, hp: 30, attack: 16 }],
      },
    };
    expect(answer(save, false).run?.hp).toBe(20);
  });
  it("starts with base stats without automatic level scaling, leaving permission to the server", () => {
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
  it("continues a cleared lap from the same place without healing or resetting moves", () => {
    let save = entered();
    for (let i = 0; i < 3; i++)
      save = answer(answer(move(save, `s${i}`, 0.1), true), true);
    const next = continueExploring(save);
    expect(next.run?.phase).toBe("path");
    expect(next.run?.hp).toBe(save.run?.hp);
    expect(next.run?.moves).toBe(3);
    expect(next.run?.readIds).toEqual(save.run?.readIds);
    expect(next.run?.kills).toBe(0);
    expect(next.clears.resource).toBe(1);
    expect(continueExploring({ ...save, battleFeedback: "正解" })).toEqual({
      ...save,
      battleFeedback: "正解",
    });
    if (!save.run) throw new Error("Expected run");
    expect(
      continueExploring({ ...save, run: { ...save.run, moves: 5 } }).run?.phase,
    ).toBe("rest");
  });
});
