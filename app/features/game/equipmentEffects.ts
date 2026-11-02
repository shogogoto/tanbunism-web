const statLabels: Record<string, string> = {
  attack: "攻撃力",
  defense: "守備力",
  specialAttack: "特攻",
  specialDefense: "特守",
  maxHp: "最大HP",
  maxMp: "最大MP",
  speed: "速さ",
  damageDealt: "属性威力",
  damageTaken: "属性耐性",
};

export function describeEquipmentEffects(
  effects: readonly {
    stat: string;
    amount: number;
    amount_mode: "fixed" | "percent";
    affected_element?: string | null;
  }[],
  elementNames?: Record<string, string>,
) {
  return effects
    .map((effect) => {
      const element = effect.affected_element;
      return `${element ? `${elementNames?.[element] ?? element} ` : ""}${statLabels[effect.stat] ?? effect.stat} +${effect.amount}${effect.amount_mode === "percent" ? "%" : ""}`;
    })
    .join(" · ");
}
