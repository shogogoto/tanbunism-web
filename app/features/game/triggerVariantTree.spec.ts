import { describe, expect, it } from "vitest";
import type { GameCatalog, TriggerDefinition } from "./catalog";
import { sampleCatalog } from "./catalog.fixtures";
import { combinationTrigger } from "./triggerVariantTree";
import { resolveTriggerVariantSets, triggerVariant } from "./triggerVariants";

function fixture(): GameCatalog {
  return {
    ...structuredClone(sampleCatalog),
    trigger_variant_sets: [
      {
        id: "targets",
        name: "対象",
        field: "target",
        values: [{ id: "ally", name: "味方", value: "ally" }],
      },
      {
        id: "ratios",
        name: "割合",
        field: "threshold",
        values: [
          { id: "half", name: "50%", value: 50 },
          { id: "low", name: "30%", value: 30 },
        ],
      },
    ],
    triggers: [
      {
        id: "hp",
        name: "HP",
        enabled: true,
        condition: "hp_below",
        threshold: 70,
        target: "enemy",
        variant_set_ids: ["targets"],
        variants: [
          {
            id: "friend",
            name: "組み合わせ",
            variant_selections: [{ set_id: "targets", value_id: "ally" }],
            variant_set_ids: ["ratios"],
          },
          {
            id: "friend_half",
            name: "組み合わせ",
            base_variant_id: "friend",
            variant_selections: [{ set_id: "ratios", value_id: "half" }],
          },
          {
            id: "equal",
            name: "同じ",
            base_variant_id: "friend_half",
            field: "comparison",
            value: "equal",
          },
        ],
      },
    ],
  };
}
function root(catalog: GameCatalog): TriggerDefinition {
  const trigger = catalog.triggers?.[0];
  if (!trigger) throw new Error("missing fixture");
  return trigger;
}

describe("shared trigger variant composition", () => {
  it("inherits nested selections, reuses IDs and propagates set edits without a Cartesian expansion", () => {
    const input = fixture();
    const resolved = resolveTriggerVariantSets(input);
    const hp = root(resolved);
    expect(hp.variants).toHaveLength(3);
    expect(triggerVariant(hp, "equal")).toMatchObject({
      condition: "stat",
      comparison: "equal",
      stat_basis: "percent",
      target: "ally",
      threshold: 50,
    });
    expect(hp.variants?.[1].resolved_name).toBe("味方, 50%");
    expect(
      combinationTrigger(hp, "friend", [{ set_id: "ratios", value_id: "half" }])
        .id,
    ).toBe("friend_half");
    const changed = structuredClone(resolved);
    const choice = changed.trigger_variant_sets?.[1].values[0];
    if (!choice) throw new Error("missing choice");
    choice.name = "60%";
    choice.value = 60;
    const updated = root(resolveTriggerVariantSets(changed));
    expect(triggerVariant(updated, "friend_half")?.threshold).toBe(60);
    expect(updated.variants?.[2].resolved_name).toBe("味方, 60%, 同じ");
    expect(root(input).variants?.[0].resolved_values).toBeUndefined();
  });

  it("migrates the former single set without changing purchased candidate IDs", () => {
    const input = fixture();
    input.triggers = [
      {
        ...root(input),
        variant_set_ids: [],
        variant_set_id: "ratios",
        variants: [],
      },
    ];
    const migrated = root(resolveTriggerVariantSets(input));
    expect(migrated.variant_set_id).toBeNull();
    expect(migrated.variant_set_ids).toEqual(["ratios"]);
    expect(migrated.variants?.map((v) => v.id)).toEqual(["half", "low"]);
    expect(triggerVariant(migrated, "half")?.threshold).toBe(50);
  });

  it.each(["parent", "cycle", "selection", "conflict", "mixed"])(
    "rejects an invalid %s reference",
    (problem) => {
      const input = fixture();
      const hp = root(input);
      const rows = hp.variants ?? [];
      if (problem === "parent") rows[1].base_variant_id = "missing";
      if (problem === "cycle") rows[0].base_variant_id = "friend_half";
      if (problem === "selection")
        rows[1].variant_selections = [
          { set_id: "ratios", value_id: "missing" },
        ];
      if (problem === "conflict") hp.variant_set_ids = ["targets", "targets"];
      if (problem === "mixed") rows[1].value = 30;
      expect(() => resolveTriggerVariantSets(input)).toThrow();
    },
  );

  it("enforces nesting limits even when parents were resolved first", () => {
    const input = fixture();
    root(input).variants = Array.from({ length: 17 }, (_, i) => ({
      id: `v${i}`,
      name: "派生",
      field: "threshold",
      value: 30,
      ...(i ? { base_variant_id: `v${i - 1}` } : {}),
    }));
    expect(() => resolveTriggerVariantSets(input)).toThrow(/階層/);
  });
});
