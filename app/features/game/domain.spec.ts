import { describe, expect, it } from "vitest";
import {
  answer,
  continueExploring,
  enterDungeon,
  move,
  newSave,
  recoverAtEntrance,
  resumeEvent,
  visitEntranceFacility,
} from "./domain";

const entered = () => enterDungeon(newSave(), "resource", "本", 1);
describe("adventure rules", () => {
  it("visits an entrance facility without healing, exploring or starting combat", () => {
    const base = entered();
    if (!base.run) throw new Error("Expected run");
    const save = { ...base, run: { ...base.run, hp: 12, mp: 0, moves: 3 } };
    const next = visitEntranceFacility(save);
    expect(next.run).toEqual({ ...save.run, moves: 4 });
    expect(next.maps).toEqual(save.maps);
    expect(next.economy).toEqual(save.economy);
    const last = visitEntranceFacility(next);
    expect(last.run).toMatchObject({ moves: 5, phase: "rest", hp: 12, mp: 0 });
    expect(visitEntranceFacility(last)).toBe(last);
  });
  it("rejects facility visits away from the entrance, during battle, feedback or without a run", () => {
    const base = entered();
    expect(visitEntranceFacility(newSave())).toEqual(newSave());
    const away = move(base, "s", 0.9);
    expect(visitEntranceFacility(away)).toBe(away);
    const battle = move(base, "s", 0.1);
    expect(visitEntranceFacility(battle)).toBe(battle);
    const feedback = { ...base, battleFeedback: "結果" };
    expect(visitEntranceFacility(feedback)).toBe(feedback);
  });
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
  it("recovery spends one move and resumes exploration when moves remain", () => {
    const base = entered();
    if (!base.run) throw new Error("Expected run");
    const defeated = {
      ...base,
      run: {
        ...base.run,
        hp: 0,
        moves: 2,
        phase: "defeated" as const,
      },
    };
    const recovered = recoverAtEntrance(defeated);
    expect(recovered.run?.hp).toBe(recovered.run?.maxHp);
    expect(recovered.run?.moves).toBe(3);
    expect(recovered.run?.phase).toBe("path");
  });
  it("uses the last move for recovery and never exceeds the event move limit", () => {
    const base = entered();
    if (!base.run) throw new Error("Expected run");
    const recovered = recoverAtEntrance({
      ...base,
      run: { ...base.run, hp: 0, moves: 4, phase: "defeated" },
    });
    expect(recovered.run?.moves).toBe(5);
    expect(recovered.run?.phase).toBe("rest");

    const spent = {
      ...base,
      run: { ...base.run, hp: 0, moves: 5, phase: "defeated" as const },
    };
    expect(recoverAtEntrance(spent)).toBe(spent);
  });
  it("heals an injured player at the entrance without requiring defeat", () => {
    const base = entered();
    if (!base.run) throw new Error("Expected run");
    const injured = { ...base, run: { ...base.run, hp: 12, moves: 1 } };
    expect(recoverAtEntrance(injured).run).toMatchObject({
      hp: base.run.maxHp,
      moves: 2,
      phase: "path",
    });
    expect(recoverAtEntrance(base)).toBe(base);
    const away = {
      ...injured,
      maps: {
        resource: { current: "s", places: [{ id: "s", region: 0 }], edges: [] },
      },
    };
    expect(recoverAtEntrance(away)).toBe(away);
    const fighting = {
      ...injured,
      run: { ...injured.run, phase: "battle" as const },
    };
    expect(recoverAtEntrance(fighting)).toBe(fighting);
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
