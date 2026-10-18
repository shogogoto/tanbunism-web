import { useEffect, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import DamageEffectSettings, {
  effectLabelKeys,
  effectThresholdKeys,
} from "./DamageEffectSettings";
import FormulaSettings from "./FormulaSettings";
import PracticeBattle from "./PracticeBattle";
import Simulation from "./Simulation";
import {
  type BattleSettings,
  type EnemyConditions,
  type PracticeEnemyTrial,
  requestBattleSettings,
} from "./api";

const fields = {
  gambit_levels_per_slot: ["ガンビット枠を追加するLv間隔", 2, 100, 1],
  specialty_levels_per_slot: ["専門分野の装備枠を追加するLv間隔", 2, 100, 1],
  chest_gold: ["ゴールド / 宝箱", 0, 100000, 1],
  chest_healing_potions: ["回復薬 / 宝箱", 0, 100, 1],
  chest_step_potions: ["歩数回復薬 / 宝箱", 0, 100, 1],
  base_hp: ["初期HP", 1, 10000, 1],
  base_mp: ["初期MP", 0, 10000, 1],
  base_attack: ["初期攻", 1, 1000, 1],
  base_defense: ["初期守", 0, 1000, 1],
  base_speed: ["初期速さ", 1, 1000, 1],
  speed_per_point: ["速さ", 1, 100, 1],
  enemy_speed: ["敵の速さ", 1, 1000, 1],
  base_seconds: ["初期持ち時間（秒）", 5, 300, 1],
  hp_per_point: ["HP / 育成ポイント", 1, 100, 1],
  mp_per_point: ["MP / 育成ポイント", 1, 100, 1],
  skill_mp_cost: ["専門分野の消費MP", 1, 10000, 1],
  skill_term_attack: ["専門分野の攻撃力補正", 0.1, 100, 0.1],
  boss_hp_multiplier: ["ボスのHP倍率", 1, 20, 0.1],
  boss_attack_multiplier: ["ボスの攻撃力倍率", 1, 10, 0.05],
  attack_per_point: ["攻 / 育成ポイント", 1, 100, 1],
  defense_per_point: ["守 / 育成ポイント", 1, 100, 1],
  enemy_hp: ["敵の基礎HP", 1, 10000, 1],
  enemy_attack: ["敵の基礎攻", 1, 1000, 1],
  power_hp: ["PowerのHP補正", 0, 100, 0.1],
  power_attack: ["Powerの攻補正", 0, 100, 0.1],
  region_hp_growth_percent: ["達成度帯ごとのHP成長率（%）", 0, 1000, 1],
  region_attack_growth_percent: ["達成度帯ごとの攻成長率（%）", 0, 1000, 1],
  enemy_variance_percent: ["敵能力のばらつき（±%）", 0, 50, 1],
  damage_attack_multiplier: ["攻撃力の倍率", 0, 10, 0.1],
  damage_defense_divisor: [
    "守備力の除数（大きいほど軽減が小さい）",
    0.1,
    100,
    0.1,
  ],
  damage_variance_percent: ["ダメージの乱数幅（±%）", 0, 50, 1],
  battle_tempo_slow_seconds: ["遅（秒）", 0.1, 10, 0.1],
  battle_tempo_medium_seconds: ["中（秒）", 0.1, 10, 0.1],
  battle_tempo_fast_seconds: ["速（秒）", 0.1, 10, 0.1],
  enemy_types: ["領域ごとの敵の種類数", 1, 20, 1],
  enemy_types_per_region: ["領域が進むごとの種類数の増加", 0, 20, 1],
  quizzes_per_enemy_coefficient: ["達成度あたりの固定クイズ数", 0.1, 5, 0.1],
  min_enemies: ["同時出現数の下端", 1, 20, 1],
  max_encounter_enemies: ["同時出現数の上端", 1, 20, 1],
  encounter_growth_rate: ["同時出現数の増加率", 0, 10, 0.1],
} as const;
const formulaLabels: Partial<Record<keyof typeof fields, string>> = {
  enemy_hp: "基礎HP",
  enemy_attack: "基礎攻撃力",
  power_hp: "Power補正",
  power_attack: "Power補正",
  region_hp_growth_percent: "HP成長率",
  region_attack_growth_percent: "攻の成長率",
  enemy_variance_percent: "ばらつき",
  damage_attack_multiplier: "倍率",
  damage_defense_divisor: "除数",
  damage_variance_percent: "乱数幅",
  battle_tempo_slow_seconds: "遅",
  battle_tempo_medium_seconds: "中",
  battle_tempo_fast_seconds: "速",
  enemy_types: "初期種類数",
  enemy_types_per_region: "増加種類数",
  quizzes_per_enemy_coefficient: "問数係数",
  min_enemies: "最小数",
  max_encounter_enemies: "最大数",
  encounter_growth_rate: "増加率",
};
const groups = [
  {
    label: "ガンビット",
    rules: ["初期1枠。指定Lvの倍数ごとに1枠追加（最大10枠）"],
    keys: ["gambit_levels_per_slot", "specialty_levels_per_slot"],
  },
  {
    label: "領域の宝箱",
    rules: [
      "各領域の最後に1箱。開封は歩数消費なし",
      "全領域共通。設定変更は未開封の箱に反映",
    ],
    keys: ["chest_gold", "chest_healing_potions", "chest_step_potions"],
  },
  {
    label: "戦闘結果の表示テンポ",
    inline: true,
    keys: [
      "battle_tempo_slow_seconds",
      "battle_tempo_medium_seconds",
      "battle_tempo_fast_seconds",
    ],
  },
  {
    label: "プレイヤーの初期値",
    keys: [
      "base_hp",
      "base_mp",
      "base_attack",
      "base_defense",
      "base_speed",
      "base_seconds",
    ],
  },
  {
    label: "育成ポイントあたりの上昇量",
    keys: [
      "hp_per_point",
      "mp_per_point",
      "attack_per_point",
      "defense_per_point",
      "speed_per_point",
    ],
  },
  {
    label: "ボス",
    keys: ["boss_hp_multiplier", "boss_attack_multiplier"],
  },
  {
    label: "ダメージ計算",
    formula: "damage",
    keys: [
      "damage_attack_multiplier",
      "damage_defense_divisor",
      "damage_variance_percent",
    ],
  },
  {
    label: "敵ステータスの計算",
    formula: "stats",
    keys: [
      "enemy_hp",
      "enemy_attack",
      "power_hp",
      "power_attack",
      "region_hp_growth_percent",
      "region_attack_growth_percent",
      "enemy_variance_percent",
    ],
  },
  {
    label: "敵ロスターと遭遇の抽選",
    formula: "roster",
    rules: [
      "クイズセット間の共有・未割り当てを許可",
      "実ダンジョンへの反映は「ダンジョン母集団 → 敵だけ再構成」",
      "出現数は範囲内から抽選し、設定変更は次の戦闘から反映",
      "同じ種類の敵も複数出現",
      "小数は切り上げ、同時出現は最大20体",
    ],
    keys: [
      "enemy_types",
      "enemy_types_per_region",
      "quizzes_per_enemy_coefficient",
      "min_enemies",
      "max_encounter_enemies",
      "encounter_growth_rate",
    ],
  },
] as const;

export default function BattleSettingsManager() {
  const [settings, setSettings] = useState<BattleSettings>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [practiceTrials, setPracticeTrials] = useState<PracticeEnemyTrial[]>(
    [],
  );
  const [selectedTrial, setSelectedTrial] = useState<PracticeEnemyTrial>();
  const [enemyConditions, setEnemyConditions] = useState<EnemyConditions>({
    power: 100,
    achievement: 1,
  });
  const settingInput = (kind: keyof typeof fields, compact = false) => {
    const [label, min, max, step] = fields[kind];
    const input = (
      <Input
        id={`battle-${kind}`}
        form="game-settings"
        aria-label={label}
        title={label}
        type="number"
        min={min}
        max={max}
        step={step}
        required
        disabled={saving}
        className={compact ? "w-20 shrink-0" : "w-28 shrink-0"}
        value={settings?.[kind] ?? ""}
        onChange={(event) => {
          setSaved(false);
          setSettings(
            (current) =>
              current && {
                ...current,
                [kind]: Number(event.target.value),
              },
          );
        }}
      />
    );
    return compact ? (
      <span className="relative my-2 inline-flex shrink-0">
        <Label
          htmlFor={`battle-${kind}`}
          className="absolute -top-5 left-0 whitespace-nowrap text-xs text-muted-foreground"
        >
          {formulaLabels[kind] ?? label}
        </Label>
        {input}
      </span>
    ) : (
      <div className="grid min-w-0 grid-rows-[1fr_auto] gap-2">
        <Label
          htmlFor={`battle-${kind}`}
          className="self-start whitespace-normal text-xs leading-relaxed text-muted-foreground"
        >
          {label}
        </Label>
        {input}
      </div>
    );
  };
  useEffect(() => {
    let active = true;
    requestBattleSettings().then(
      (value) => {
        if (active) setSettings(value);
      },
      (cause) => {
        if (active) setError(cause.message);
      },
    );
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">ゲームバランス</h2>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <div className="space-y-6">
        {saved && <output className="block">ゲーム設定を保存しました</output>}
        {settings && (
          <div className="space-y-4">
            <form
              id="game-settings"
              onSubmit={(event) => {
                event.preventDefault();
                setError(undefined);
                setSaved(false);
                if (settings.min_enemies > settings.max_encounter_enemies) {
                  setError("下限は上限以下にしてください。");
                  return;
                }
                if (
                  !(
                    settings.battle_tempo_fast_seconds <=
                      settings.battle_tempo_medium_seconds &&
                    settings.battle_tempo_medium_seconds <=
                      settings.battle_tempo_slow_seconds
                  )
                ) {
                  setError("戦闘テンポは遅・中・速の順に短くしてください。");
                  return;
                }
                const thresholds = effectThresholdKeys.map(
                  (key) => settings[key],
                );
                if (
                  !(
                    thresholds[0] < thresholds[1] &&
                    thresholds[1] < thresholds[2]
                  )
                ) {
                  setError("演出の区切りは小さい順に設定してください。");
                  return;
                }
                if (effectLabelKeys.some((key) => !settings[key].trim())) {
                  setError("演出の文言を入力してください。");
                  return;
                }
                setSaving(true);
                void requestBattleSettings(settings)
                  .then((value) => {
                    setSettings(value);
                    setSaved(true);
                  })
                  .catch((cause) => setError(cause.message))
                  .finally(() => setSaving(false));
              }}
            />
            <div className="space-y-5">
              <section aria-label="行動順" className="rounded-lg border p-4">
                <h3 className="mb-3 font-medium">行動順</h3>
                <div className="flex flex-wrap items-end gap-6">
                  <label className="grid gap-2 text-xs text-muted-foreground">
                    速さの計算方式
                    <select
                      form="game-settings"
                      aria-label="速さの計算方式"
                      className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
                      value={settings.speed_formula}
                      onChange={(event) =>
                        setSettings({
                          ...settings,
                          speed_formula: event.target.value as
                            | "linear"
                            | "sqrt",
                        })
                      }
                    >
                      <option value="sqrt">平方根</option>
                      <option value="linear">比例</option>
                    </select>
                  </label>
                  {settingInput("enemy_speed")}
                  <p className="text-sm">
                    行動間隔 = 12 ÷{" "}
                    {settings.speed_formula === "sqrt" ? "√速さ" : "速さ"}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  計算方式は戦闘開始時に固定。模擬戦では保存前の設定を使用します。
                </p>
              </section>
              {groups.map((group) => (
                <section
                  key={group.label}
                  aria-label={group.label}
                  className="overflow-hidden rounded-lg border"
                >
                  {"inline" in group ? (
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b bg-muted/40 px-4 py-3">
                      <h3 className="shrink-0 font-medium">
                        {group.label}(sec)
                      </h3>
                      <div className="ml-auto grid grid-cols-3 gap-3">
                        {group.keys.map((kind) => (
                          <div key={kind}>{settingInput(kind, true)}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border-b bg-muted/40 px-4 py-3">
                      <h3 className="font-medium">{group.label}</h3>
                      {"rules" in group && (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {group.rules.map((rule) => (
                            <li key={rule}>{rule}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {"formula" in group ? (
                    <FormulaSettings
                      kind={group.formula}
                      input={(kind) => settingInput(kind, true)}
                    />
                  ) : "inline" in group ? null : (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
                      {group.keys.map((kind) => (
                        <div key={kind} className="grid min-w-0">
                          {settingInput(kind)}
                        </div>
                      ))}
                    </div>
                  )}
                  {group.label === "ダメージ計算" && (
                    <DamageEffectSettings
                      settings={settings}
                      disabled={saving}
                      onChange={(value) => {
                        setSaved(false);
                        setSettings(value);
                      }}
                    />
                  )}
                </section>
              ))}
            </div>
            <div className="flex justify-center">
              <Button disabled={saving} type="submit" form="game-settings">
                {saving ? "保存中…" : "保存"}
              </Button>
            </div>
            <div className="scroll-mt-20">
              <PracticeBattle
                settings={settings}
                enemyConditions={enemyConditions}
                trials={practiceTrials}
                selectedTrial={selectedTrial}
                enemyPreview={
                  <Simulation
                    conditions={enemyConditions}
                    onConditionsChange={setEnemyConditions}
                    onTrialsChange={(trials) => {
                      setPracticeTrials(trials);
                      if (!trials.length) setSelectedTrial(undefined);
                    }}
                    onPracticeTrial={setSelectedTrial}
                    settings={settings}
                    labels={Object.fromEntries(
                      groups
                        .filter(
                          (item) =>
                            item.label === "敵ステータスの計算" ||
                            item.label === "敵ロスターと遭遇の抽選",
                        )
                        .flatMap((item) =>
                          item.keys.map((key) => [key, fields[key][0]]),
                        ),
                    )}
                  />
                }
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
