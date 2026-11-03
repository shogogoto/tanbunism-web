import { describe, expect, it } from "vitest";
import { migrateEnemyGambitSets } from "./catalog";
import { sampleCatalog } from "./catalog.fixtures";

describe("enemy gambit migration", () => {
  it("preserves inline rule priorities and references and does not duplicate sets on reload", () => {
    const rules = [
      {
        trigger_id: "hp_below",
        trigger_variant_id: "half",
        skill_id: "heal",
        enabled: true,
      },
      { trigger_id: "always", skill_id: "fire", enabled: false },
    ];
    const catalog = {
      ...sampleCatalog,
      enemies: [{ ...sampleCatalog.enemies[0], gambits: rules }],
    };
    const migrated = migrateEnemyGambitSets(catalog);
    expect(migrated.gambit_sets).toHaveLength(1);
    expect(migrated.gambit_sets?.[0].rules).toEqual(rules);
    expect(migrated.enemies[0].gambits).toEqual([]);
    expect(migrated.enemies[0].gambit_set_id).toBe(
      migrated.gambit_sets?.[0].id,
    );
    expect(migrateEnemyGambitSets(migrated)).toEqual(migrated);
    expect(catalog.enemies[0].gambits).toEqual(rules);
  });
});
