import type { ReactNode } from "react";

export type FormulaField =
  | "damage_attack_multiplier"
  | "damage_defense_divisor"
  | "damage_variance_percent"
  | "enemy_hp"
  | "enemy_attack"
  | "enemy_defense"
  | "enemy_mp"
  | "enemy_special_attack"
  | "enemy_special_defense"
  | "power_mp"
  | "power_special_attack"
  | "power_special_defense"
  | "region_mp_growth_percent"
  | "region_special_attack_growth_percent"
  | "region_special_defense_growth_percent"
  | "enemy_speed"
  | "power_hp"
  | "power_attack"
  | "power_speed"
  | "region_hp_growth_percent"
  | "region_attack_growth_percent"
  | "region_speed_growth_percent"
  | "enemy_variance_percent"
  | "enemy_types"
  | "enemy_types_per_region"
  | "quizzes_per_enemy_coefficient"
  | "min_enemies"
  | "max_encounter_enemies"
  | "encounter_growth_rate";

function FormulaRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-3 px-4 py-3 text-sm tabular-nums">
      {children}
    </div>
  );
}

export default function FormulaSettings({
  kind,
  input,
}: {
  kind: "damage" | "stats" | "roster";
  input: (field: FormulaField) => ReactNode;
}) {
  if (kind === "damage") {
    return (
      <FormulaRow>
        <span>ダメージ ≈ max(1, (</span>
        <span className="inline-flex items-center gap-2">
          攻 × {input("damage_attack_multiplier")}
        </span>
        <span>−</span>
        <span className="inline-flex items-center gap-2">
          守 ÷ {input("damage_defense_divisor")}
        </span>
        <span>) × (1 ±</span>
        <span className="inline-flex items-center gap-2">
          {input("damage_variance_percent")}
          %))
        </span>
      </FormulaRow>
    );
  }
  if (kind === "stats") {
    return (
      <div className="divide-y">
        {(
          [
            ["HP", "enemy_hp", "power_hp", "region_hp_growth_percent"],
            ["MP", "enemy_mp", "power_mp", "region_mp_growth_percent"],
            [
              "特攻",
              "enemy_special_attack",
              "power_special_attack",
              "region_special_attack_growth_percent",
            ],
            [
              "特守",
              "enemy_special_defense",
              "power_special_defense",
              "region_special_defense_growth_percent",
            ],
            [
              "攻撃力",
              "enemy_attack",
              "power_attack",
              "region_attack_growth_percent",
            ],
            [
              "速さ",
              "enemy_speed",
              "power_speed",
              "region_speed_growth_percent",
            ],
          ] as const
        ).map(([label, base, power, growth]) => (
          <FormulaRow key={base}>
            <span>{label} = (</span>
            {input(base)}
            <span>+ log(1 + Power) ×</span>
            {input(power)}
            <span>) ×</span>
            <span>[1 + (達成度帯 − 1) ×</span>
            <span className="inline-flex items-center gap-2">
              {input(growth)}
              %]
            </span>
            <span>× 個体差</span>
          </FormulaRow>
        ))}
        <FormulaRow>
          <span>守備力 =</span>
          {input("enemy_defense")}
        </FormulaRow>
        <FormulaRow>
          <span>個体差 = 1 ±</span>
          {input("enemy_variance_percent")}
          <span>%</span>
          <span className="text-muted-foreground">種類IDごとに固定</span>
        </FormulaRow>
      </div>
    );
  }
  return (
    <div className="divide-y">
      <FormulaRow>
        <span>種類数 =</span>
        {input("enemy_types")}
        <span>+ (達成度帯 − 1) ×</span>
        {input("enemy_types_per_region")}
      </FormulaRow>
      <FormulaRow>
        <span>固定問数 = 達成度帯 ×</span>
        {input("quizzes_per_enemy_coefficient")}
      </FormulaRow>
      <FormulaRow>
        <span>同時出現数 = (</span>
        <span className="inline-flex items-center gap-2">
          {input("min_enemies")}〜{input("max_encounter_enemies")}
        </span>
        <span>) × [1 + (達成度帯 − 1) ×</span>
        {input("encounter_growth_rate")}
        <span>]</span>
      </FormulaRow>
    </div>
  );
}
