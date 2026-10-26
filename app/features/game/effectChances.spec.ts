import { expect, it } from "vitest";
import { sampleCatalog } from "./catalog.fixtures";
import { rebindEffectChances } from "./effectChances";

it("preserves probabilities by binding when replacing and by identity when removing", () => {
  const skill = {
    ...sampleCatalog.skills[0],
    template_ids: ["hit", "poison"],
    effect_chances: { hit: 100, poison: 30 },
  };
  expect(rebindEffectChances(skill, ["hit", "burn"])).toEqual({
    hit: 100,
    burn: 30,
  });
  expect(rebindEffectChances(skill, ["poison"])).toEqual({ poison: 30 });
  expect(rebindEffectChances(skill, ["hit", "poison", "new"])).toEqual({
    hit: 100,
    poison: 30,
  });
});
