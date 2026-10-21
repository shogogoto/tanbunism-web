import {
  type SkillDefinition,
  type SkillPatch,
  normalizeSkill,
} from "~/features/game/catalog";

export type EffectMode = "fixed" | "multiplier";
export const isStatus = (skill: SkillDefinition) =>
  ["buff", "debuff", "ailment"].includes(skill.effect);
export const templateKind = (skill: SkillDefinition) =>
  isStatus(skill)
    ? "status"
    : skill.effect === "recover_moves"
      ? "other"
      : (skill.damage_type ?? "physical");

export const instantResource = (skill: SkillDefinition) =>
  skill.effect === "heal_mp" || skill.effect === "damage_mp" ? "mp" : "hp";

export function effectValue(
  skill: SkillDefinition,
  wrong = false,
): { mode: EffectMode; value: number } {
  const result =
    wrong && skill.on_wrong?.type === "reduced" ? skill.on_wrong : undefined;
  if (isStatus(skill))
    return {
      mode: "fixed",
      value:
        result && "apply" in result && !result.apply
          ? 0
          : result
            ? "duration_turns" in result
              ? (result.duration_turns ?? skill.duration_turns ?? 3)
              : (skill.duration_turns ?? 3)
            : (skill.duration_turns ?? 3),
    };
  const effect = skill.effect;
  const amount = result && "amount" in result ? result.amount : skill.amount;
  const multiplier =
    result && "multiplier" in result
      ? (result.multiplier ?? 0)
      : skill.effect === "attack"
        ? skill.multiplier
        : 0;
  const percent =
    (result && "amount_mode" in result ? result.amount_mode : undefined) ??
    skill.amount_mode;
  return effect === "attack" &&
    (multiplier !== 0 || (percent === "percent" && amount === 0))
    ? { mode: "multiplier", value: multiplier }
    : {
        mode: percent === "percent" ? "multiplier" : "fixed",
        value: amount / (percent === "percent" ? 100 : 1),
      };
}

export function effectPatch(
  skill: SkillDefinition,
  mode: EffectMode,
  value: number,
  wrong = false,
): SkillPatch {
  if (isStatus(skill))
    return wrong
      ? {
          on_wrong:
            skill.effect === "ailment"
              ? { type: "reduced", apply: value > 0, duration_turns: value }
              : {
                  type: "reduced",
                  amount: skill.amount,
                  duration_turns: value,
                },
        }
      : { duration_turns: value };
  const kind =
    skill.effect === "recover_moves" ? "other" : instantResource(skill);
  const effect =
    kind === "hp"
      ? skill.effect === "heal_hp"
        ? "heal_hp"
        : "attack"
      : kind === "mp"
        ? skill.effect === "heal_mp"
          ? "heal_mp"
          : "damage_mp"
        : skill.effect;
  const amount =
    effect === "attack" && mode === "multiplier"
      ? 0
      : mode === "multiplier"
        ? Math.round(value * 100)
        : value;
  const multiplier = effect === "attack" && mode === "multiplier" ? value : 0;
  const amount_mode = mode === "multiplier" ? "percent" : "fixed";
  if (wrong)
    return {
      on_wrong: {
        type: "reduced",
        amount,
        ...(effect === "attack" ? { multiplier } : {}),
        amount_mode,
      } as SkillPatch["on_wrong"],
    };
  return {
    effect,
    amount,
    amount_mode,
    ...(effect === "attack" ? { multiplier } : {}),
    target: effect === "attack" || effect === "damage_mp" ? "enemy" : "self",
  };
}

export function changeKind(
  skill: SkillDefinition,
  kind: string,
): SkillDefinition {
  if (
    (kind === "physical" || kind === "special") &&
    !isStatus(skill) &&
    skill.effect !== "recover_moves"
  )
    return normalizeSkill({ ...skill, damage_type: kind });
  return normalizeSkill({
    ...skill,
    effect:
      kind === "other"
        ? "recover_moves"
        : kind === "status"
          ? "buff"
          : "attack",
    damage_type: kind === "special" ? "special" : "physical",
    target: kind === "physical" || kind === "special" ? "enemy" : "self",
    amount: 0,
    multiplier: 1,
    amount_mode: "fixed",
    stat: "attack",
    on_wrong: { type: "fizzle" },
  });
}

export function changeDetail(
  skill: SkillDefinition,
  recovery: boolean,
): SkillPatch {
  const effect =
    instantResource(skill) === "mp"
      ? recovery
        ? "heal_mp"
        : "damage_mp"
      : recovery
        ? "heal_hp"
        : "attack";
  const current = effectValue(skill);
  const draft = normalizeSkill({ ...skill, effect });
  const wrong = effectValue(skill, true);
  return {
    ...effectPatch(draft, current.mode, current.value),
    ...(skill.on_wrong?.type === "reduced"
      ? effectPatch(draft, wrong.mode, wrong.value, true)
      : {}),
  };
}

export function changeResource(
  skill: SkillDefinition,
  resource: string,
): SkillPatch {
  const recovery = skill.effect === "heal_hp" || skill.effect === "heal_mp";
  const effect =
    resource === "mp"
      ? recovery
        ? "heal_mp"
        : "damage_mp"
      : recovery
        ? "heal_hp"
        : "attack";
  const value = effectValue(skill);
  const wrong = effectValue(skill, true);
  const draft = normalizeSkill({ ...skill, effect });
  return {
    ...effectPatch(draft, value.mode, value.value),
    ...(skill.on_wrong?.type === "reduced"
      ? effectPatch(draft, wrong.mode, wrong.value, true)
      : {}),
  };
}

export function stateDetail(skill: SkillDefinition) {
  return skill.effect === "buff" || skill.effect === "debuff"
    ? skill.effect
    : stateRecovery(skill)
      ? "recovery"
      : "damage";
}

export function changeStateDetail(
  skill: SkillDefinition,
  detail: string,
  resource = stateResource(skill),
): SkillPatch {
  const periodic = detail === "recovery" || detail === "damage";
  const selected = periodic
    ? resource === "mp"
      ? "mp"
      : "hp"
    : [
          "attack",
          "defense",
          "specialAttack",
          "specialDefense",
          ...(detail === "buff" ? ["maxHp"] : []),
        ].includes(resource)
      ? resource
      : "attack";
  return changeState(
    skill,
    selected,
    detail === "recovery" || detail === "buff",
  );
}

export function stateResource(skill: SkillDefinition) {
  return skill.effect === "ailment"
    ? ["curse", "refresh"].includes(skill.ailment ?? "poison")
      ? "mp"
      : "hp"
    : (skill.stat ?? "attack");
}

export function stateRecovery(skill: SkillDefinition) {
  return (
    skill.effect === "buff" ||
    (skill.effect === "ailment" &&
      ["regen", "refresh"].includes(skill.ailment ?? "poison"))
  );
}

export function changeState(
  skill: SkillDefinition,
  resource: string,
  recovery: boolean,
): SkillPatch {
  const periodic = resource === "hp" || resource === "mp";
  const effect = periodic ? "ailment" : recovery ? "buff" : "debuff";
  const wrong = skill.on_wrong;
  return {
    effect,
    ailment:
      resource === "mp"
        ? recovery
          ? "refresh"
          : "curse"
        : recovery
          ? "regen"
          : "poison",
    stat: resource as SkillPatch["stat"],
    amount: periodic ? Math.max(1, skill.amount) : skill.amount,
    ...(resource === "maxHp" ? { amount_mode: "percent" as const } : {}),
    on_wrong:
      wrong?.type === "reduced"
        ? periodic
          ? {
              type: "reduced",
              apply: true,
              duration_turns: wrong.duration_turns ?? 1,
            }
          : {
              type: "reduced",
              amount: skill.amount,
              duration_turns: wrong.duration_turns ?? 1,
            }
        : wrong,
  };
}
