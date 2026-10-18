import { describe, expect, it } from "vitest";
import {
  damageEffect,
  defaultBalance,
  playerStats,
  remainingHp,
} from "./battle";
import { enterDungeon, newSave } from "./domain";

describe("allocated stats and browser-local enemy HP", () => {
  it("level alone never raises stats", () => {
    expect(enterDungeon(newSave(), "book", "本", 100).run).toEqual(
      enterDungeon(newSave(), "book", "本", 1).run,
    );
    expect(
      playerStats({ hp: 1, attack: 1, defense: 0 }, defaultBalance),
    ).toEqual({
      maxHp: 40,
      maxMp: 10,
      attack: 12,
      defense: 1,
      specialAttack: 10,
      specialDefense: 1,
      speed: 10,
      answerSeconds: defaultBalance.base_seconds,
    });
  });
  it("special stats grow independently from physical stats", () => {
    const stats = playerStats(
      { hp: 0, attack: 0, defense: 0, specialAttack: 3, specialDefense: 2 },
      defaultBalance,
    );
    expect(stats).toMatchObject({
      attack: 10,
      defense: 1,
      specialAttack: 16,
      specialDefense: 3,
    });
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

describe("four damage effect bands", () => {
  it("uses ordered boundaries with equality belonging to the higher band", () => {
    expect(
      [89, 90, 109, 110, 114, 115, 120].map(
        (damage) => damageEffect(damage, 100, defaultBalance).level,
      ),
    ).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it("scales thresholds with variance and uses configured labels", () => {
    const settings = {
      ...defaultBalance,
      damage_variance_percent: 10,
      damage_effect_label_4: "大当たり",
    };
    expect(damageEffect(105, 100, settings).level).toBe(2);
    expect(damageEffect(108, 100, settings)).toEqual({
      level: 3,
      label: "大当たり",
    });
  });
  it("uses the ordinary hit for zero variance even if thresholds were customized", () => {
    expect(
      damageEffect(10, 10, {
        ...defaultBalance,
        damage_variance_percent: 0,
        damage_effect_threshold_1: -90,
        damage_effect_threshold_2: -80,
        damage_effect_threshold_3: -70,
      }),
    ).toEqual({ level: 1, label: "HIT" });
  });
});
