import {
  type SkillDefinition,
  type SkillPatch,
  type SkillTemplate,
  normalizeSkill,
  skillTemplate,
} from "~/features/game/catalog";
import { templateOverrideFields } from "~/features/game/templateVariants";
import { isStatus } from "./templateEffects";

/** Editable normalized rows, independent from React and the table layout. */
export function templateDraftRows(
  templates: SkillTemplate[],
): SkillDefinition[] {
  return templates.map((template) =>
    normalizeSkill({
      ...template,
      target:
        template.target ??
        (template.effect === "ailment" &&
        ["regen", "refresh"].includes(template.ailment ?? "poison")
          ? "self"
          : ["attack", "damage_mp", "debuff", "ailment"].includes(
                template.effect,
              )
            ? "enemy"
            : "self"),
      mp_cost: 0,
      icon: "sparkles",
      enabled: true,
    }),
  );
}

/** Preserve inheritance metadata and mark only actual changes as overrides. */
export function applyTemplatePatch(
  templates: SkillTemplate[],
  id: string,
  patch: SkillPatch,
): SkillTemplate[] {
  const rows = templateDraftRows(templates);
  const toTemplate = (skill: SkillDefinition) =>
    skillTemplate(
      skill,
      templates.find((row) => row.id === skill.id),
    );
  return rows.map((skill) => {
    const source = toTemplate(skill);
    const result = skillTemplate(
      skill.id === id
        ? normalizeSkill({
            ...skill,
            ...patch,
            ...(patch.amount !== undefined &&
            isStatus(skill) &&
            skill.on_wrong?.type === "reduced" &&
            "amount" in skill.on_wrong
              ? { on_wrong: { ...skill.on_wrong, amount: patch.amount } }
              : {}),
          })
        : skill,
      source,
    );
    return {
      ...result,
      ...(source.base_template_id
        ? {
            base_template_id: source.base_template_id,
            override_fields: [
              ...new Set([
                ...(source.override_fields ?? []),
                ...(skill.id === id
                  ? templateOverrideFields.filter(
                      (key) =>
                        JSON.stringify(skill[key as keyof SkillDefinition]) !==
                        JSON.stringify(result[key as keyof typeof result]),
                    )
                  : []),
              ]),
            ].filter((key) => key in result),
          }
        : {}),
    };
  });
}
