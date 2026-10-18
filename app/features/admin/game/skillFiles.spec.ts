import { expect, it } from "vitest";
import { type SkillDefinition, normalizeSkill } from "~/features/game/catalog";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import {
  MAX_SKILL_FILE_BYTES,
  readSkillFile,
  skillFileText,
} from "./skillFiles";

it("writes a versioned skills-only file without granting access or exporting consumers", async () => {
  const skills = sampleCatalog.skills.map((s) => ({ ...s, enabled: false }));
  const text = skillFileText(skills);
  expect(JSON.parse(text)).toEqual({
    format: "tanbunism.skills",
    version: 3,
    skills: skills.map(normalizeSkill),
  });
  expect(
    await readSkillFile(new File([`\uFEFF${text}`], "skills.json")),
  ).toEqual(JSON.parse(text));
});

it("removes legacy foreign fields from an export without mutating the source", () => {
  const legacy: SkillDefinition = JSON.parse(
    JSON.stringify({
      ...sampleCatalog.skills[0],
      ailment: "poison",
      stat: "attack",
      duration_turns: 3,
      stack_limit: 1,
    }),
  );
  const attack = JSON.parse(skillFileText([legacy])).skills[0];
  expect(attack).toMatchObject({ effect: "attack", multiplier: 1.5 });
  for (const key of ["ailment", "stat", "duration_turns", "stack_limit"])
    expect(attack).not.toHaveProperty(key);
  expect(legacy).toHaveProperty("ailment", "poison");
});

it("rejects malformed and oversized files before sending a preview request", async () => {
  await expect(readSkillFile(new File(["{"], "bad.json"))).rejects.toThrow(
    "JSONの形式",
  );
  await expect(
    readSkillFile(
      new File([" ".repeat(MAX_SKILL_FILE_BYTES + 1)], "large.json"),
    ),
  ).rejects.toThrow("1MB以下");
});
