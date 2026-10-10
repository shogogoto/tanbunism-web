import { describe, expect, it } from "vitest";
import { defaultBalance, playerStats, remainingHp } from "./battle";
import { enterDungeon, newSave } from "./domain";

describe("allocated stats and browser-local enemy HP", () => {
  it("level alone never raises stats", () => {
    expect(enterDungeon(newSave(), "book", "本", 100).run).toEqual(
      enterDungeon(newSave(), "book", "本", 1).run,
    );
    expect(
      playerStats({ hp: 1, attack: 1, defense: 0, seconds: 1 }, defaultBalance),
    ).toEqual({ maxHp: 40, attack: 12, defense: 1, answerSeconds: 48 });
  });
  it("a live maximum increase never heals and a decrease clamps remaining HP", () => {
    const enemy = {
      id: "e",
      name: "敵",
      quizIndex: 0,
      hp: 30,
      attack: 12,
      region: 0,
      relations: 0,
    };
    expect(remainingHp({ e: 7 }, [enemy])).toEqual({ e: 7 });
    expect(remainingHp({ e: 7 }, [{ ...enemy, hp: 5 }])).toEqual({ e: 5 });
  });
});
