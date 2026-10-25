import { expect, it } from "vitest";
import {
  type SkillDefinition,
  defaultElements,
  normalizeSkill,
} from "~/features/game/catalog";
import {
  sampleCatalog,
  sampleTemplateCatalog,
} from "~/features/game/catalog.fixtures";
import {
  MAX_SKILL_FILE_BYTES,
  readSkillFile,
  skillFileText,
} from "./skillFiles";

it("exports attribute definitions alongside skills for portable custom attributes", () => {
  const elements = [
    ...defaultElements,
    {
      id: "metal",
      name: "金属",
      icon: "shield",
      color: "#889999",
      enabled: true,
    },
  ];
  const result = JSON.parse(
    skillFileText(
      [{ ...sampleCatalog.skills[0], element: "metal" }],
      [],
      elements,
    ),
  );
  expect(result.elements).toEqual(elements);
  expect(result.skills[0].element).toBe("metal");
});

it("writes a versioned skills-only file without granting access or exporting consumers", async () => {
  const skills = sampleCatalog.skills.map((s) => ({ ...s, enabled: false }));
  const text = skillFileText(skills);
  expect(JSON.parse(text)).toEqual({
    format: "tanbunism.skills",
    version: 6,
    skill_templates: [],
    skills: skills.map(normalizeSkill),
  });
  expect(
    await readSkillFile(new File([`\uFEFF${text}`], "skills.json")),
  ).toEqual(JSON.parse(text));
});

it("共有テンプレートと参照を出力し、共有値を各スキルへ複製しない", () => {
  const exported = JSON.parse(
    skillFileText(
      sampleTemplateCatalog.skills,
      sampleTemplateCatalog.skill_templates,
    ),
  );
  expect(exported.version).toBe(6);
  expect(exported.skill_templates[0]).toMatchObject({
    id: "basic_spell",
    damage_type: "special",
  });
  const fire = exported.skills.find((s: { id: string }) => s.id === "fire");
  expect(fire).toMatchObject({
    template_id: "basic_spell",
    element: "fire",
    animation: "fire",
  });
  expect(fire).not.toHaveProperty("multiplier");
  expect(fire.mp_cost).toBe(3);
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
