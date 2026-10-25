import {
  type SkillDefinition,
  type SkillPatch,
  type SkillTemplate,
  normalizeSkill,
  skillTemplate,
  statusStatLabels,
} from "~/features/game/catalog";
import { templateOverrideFields } from "~/features/game/templateVariants";
import {
  changeDetail,
  changeKind,
  changeResource,
  changeStateDetail,
  effectPatch,
  effectValue,
  instantResource,
  isStatus,
  stateDetail,
  stateResource,
  templateKind,
} from "./templateEffects";

export type VariantAxis = {
  id: string;
  label: string;
  options?: Record<string, string>;
  min?: number;
  max?: number;
  step?: number;
  read: (skill: SkillDefinition) => string | number;
  patch: (skill: SkillDefinition, value: string) => SkillPatch;
};
export function templateSkill(template: SkillTemplate): SkillDefinition {
  return normalizeSkill({
    ...template,
    target: "self",
    mp_cost: 0,
    icon: "sparkles",
    enabled: true,
  });
}

/** One visible input can correspond to several normalized JSON fields. */
export function variantAxes(
  template: SkillTemplate,
  elements: { id: string; name: string; enabled: boolean }[] = [],
): VariantAxis[] {
  const skill = templateSkill(template);
  const status = isStatus(skill);
  const other = templateKind(skill) === "other";
  const axes: VariantAxis[] = [
    {
      id: "target_count",
      label: "対象数",
      options: { "1": "1", "3": "3", "5": "5", all: "全体" },
      read: (s) => s.target_count ?? 1,
      patch: (_, v) => ({ target_count: v === "all" ? "all" : Number(v) }),
    },
    {
      id: "kind",
      label: "種別",
      options: {
        physical: "物理",
        special: "特殊",
        status: "状態",
        other: "その他",
      },
      read: templateKind,
      patch: changeKind,
    },
  ];
  if (!other) {
    axes.push({
      id: "detail",
      label: "詳細",
      options: status
        ? {
            buff: "バフ",
            debuff: "デバフ",
            damage: "ダメージ",
            recovery: "回復",
          }
        : { damage: "ダメージ", recovery: "回復" },
      read: (s) =>
        isStatus(s)
          ? stateDetail(s)
          : ["heal_hp", "heal_mp"].includes(s.effect)
            ? "recovery"
            : "damage",
      patch: (s, v) =>
        isStatus(s)
          ? changeStateDetail(s, v)
          : changeDetail(s, v === "recovery"),
    });
    axes.push({
      id: "resource",
      label: "詳細：対象ステータス",
      options:
        status && skill.effect !== "ailment"
          ? statusStatLabels
          : { hp: "HP", mp: "MP" },
      read: (s) => (isStatus(s) ? stateResource(s) : instantResource(s)),
      patch: (s, v) =>
        isStatus(s)
          ? changeStateDetail(s, stateDetail(s), v)
          : changeResource(s, v),
    });
  }
  if (status) {
    if (
      !["maxHp", "maxMp", "damageDealt", "damageTaken"].includes(
        skill.stat ?? "",
      )
    )
      axes.push({
        id: "amount_mode",
        label: "詳細：値の指定",
        options: { fixed: "定数", percent: "比率（%）" },
        read: (s) => s.amount_mode ?? "fixed",
        patch: (_, v) => ({ amount_mode: v as "fixed" | "percent" }),
      });
    axes.push({
      id: "amount",
      label: "詳細：状態の値",
      min: 0,
      max: 10000,
      step: 1,
      read: (s) => s.amount,
      patch: (_, v) => ({ amount: Number(v) }),
    });
    axes.push({
      id: "stack_limit",
      label: "詳細：重複上限",
      min: 1,
      max: 10,
      step: 1,
      read: (s) => s.stack_limit ?? 1,
      patch: (_, v) => ({ stack_limit: Number(v) }),
    });
    if (["damageDealt", "damageTaken"].includes(skill.stat ?? ""))
      axes.push({
        id: "affected_element",
        label: "詳細：補正対象属性",
        options: Object.fromEntries(
          elements
            .filter((e) => e.enabled || e.id === skill.affected_element)
            .map((e) => [e.id, e.name]),
        ),
        read: (s) => s.affected_element ?? "",
        patch: (_, v) => ({ affected_element: v }),
      });
  }
  if (!other)
    axes.push({
      id: "type",
      label: "タイプ",
      options: { counter: "反撃", fizzle: "不発", reduced: "軽減" },
      read: (s) => s.on_wrong?.type ?? "fizzle",
      patch: (s, v) =>
        v === "reduced"
          ? effectPatch(
              s,
              effectValue(s).mode,
              isStatus(s)
                ? 1
                : effectValue(s).mode === "fixed"
                  ? Math.floor(effectValue(s).value / 2)
                  : effectValue(s).value / 2,
              true,
            )
          : { on_wrong: { type: v as "counter" | "fizzle" } },
    });
  for (const wrong of skill.on_wrong?.type === "reduced"
    ? [false, true]
    : [false]) {
    const prefix = wrong ? "誤答" : "正答";
    if (!status && !other)
      axes.push({
        id: wrong ? "wrong_mode" : "power_mode",
        label: `効果：${prefix}の指定`,
        options: { fixed: "定数", multiplier: "倍率" },
        read: (s) => effectValue(s, wrong).mode,
        patch: (s, v) =>
          effectPatch(
            s,
            v as "fixed" | "multiplier",
            v === "fixed"
              ? Math.floor(effectValue(s, wrong).value)
              : effectValue(s, wrong).value,
            wrong,
          ),
      });
    axes.push({
      id: wrong ? "wrong_power" : "power",
      label: `効果：${prefix}${status ? "の行動数" : "の値"}`,
      min: status && !wrong ? 1 : 0,
      max: status
        ? 20
        : effectValue(skill, wrong).mode === "multiplier"
          ? skill.effect === "attack"
            ? 10
            : 100
          : 10000,
      step: status || effectValue(skill, wrong).mode === "fixed" ? 1 : 0.01,
      read: (s) => effectValue(s, wrong).value,
      patch: (s, v) =>
        !wrong && s.effect === "attack" && effectValue(s).mode === "multiplier"
          ? { multiplier: Number(v) }
          : effectPatch(s, effectValue(s, wrong).mode, Number(v), wrong),
    });
  }
  return axes;
}

export function axisVariant(
  base: SkillTemplate,
  axis: VariantAxis,
  value: string,
  row: SkillTemplate,
): SkillTemplate {
  const skill = templateSkill(base);
  const patch = axis.patch(skill, value);
  const result = skillTemplate(normalizeSkill({ ...skill, ...patch }));
  const primary =
    axis.id === "power"
      ? isStatus(skill)
        ? "duration_turns"
        : skill.effect === "attack" && effectValue(skill).mode === "multiplier"
          ? "multiplier"
          : "amount"
      : ["type", "wrong_power", "wrong_mode"].includes(axis.id)
        ? "on_wrong"
        : axis.id === "power_mode"
          ? "amount_mode"
          : axis.id;
  const primaryFields =
    axis.id === "kind"
      ? ["effect", "damage_type"]
      : axis.id === "resource"
        ? isStatus(skill)
          ? skill.effect === "ailment"
            ? ["ailment"]
            : ["stat"]
          : ["effect"]
        : axis.id === "detail"
          ? skill.effect === "ailment"
            ? ["effect", "ailment"]
            : ["effect"]
          : [primary];
  return {
    ...result,
    id: row.id,
    name: row.name,
    variant_label: row.variant_label,
    variant_axis: row.variant_axis,
    base_template_id: base.id,
    override_fields: templateOverrideFields.filter(
      (key) =>
        key in result &&
        (primaryFields.includes(key) ||
          JSON.stringify(skill[key as keyof SkillDefinition]) !==
            JSON.stringify(result[key as keyof SkillTemplate])),
    ),
  };
}
