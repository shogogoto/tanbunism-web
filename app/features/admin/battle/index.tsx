import { useEffect, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import Simulation from "./Simulation";
import { type BattleSettings, requestBattleSettings } from "./api";

const fields = {
  base_hp: ["初期HP", 1, 10000, 1],
  base_attack: ["初期攻", 1, 1000, 1],
  base_defense: ["初期守", 0, 1000, 1],
  base_seconds: ["初期持ち時間（秒）", 5, 300, 1],
  hp_per_point: ["HP / 育成ポイント", 1, 100, 1],
  attack_per_point: ["攻 / 育成ポイント", 1, 100, 1],
  defense_per_point: ["守 / 育成ポイント", 1, 100, 1],
  seconds_per_point: ["秒 / 育成ポイント", 1, 30, 1],
  enemy_hp: ["敵の基礎HP", 1, 10000, 1],
  enemy_attack: ["敵の基礎攻", 1, 1000, 1],
  power_hp: ["PowerのHP補正", 0, 100, 0.1],
  power_attack: ["Powerの攻補正", 0, 100, 0.1],
  relation_hp: ["関係数のHP補正", 0, 100, 0.1],
  relation_attack: ["関係数の攻補正", 0, 100, 0.1],
  relation_cap: ["関係数の上限", 0, 1000, 1],
  region_hp: ["達成度帯ごとのHP上昇", 0, 100, 1],
  region_attack: ["達成度帯ごとの攻上昇", 0, 100, 1],
  enemy_variance_percent: ["敵能力のばらつき（±%）", 0, 50, 1],
  enemy_types: ["領域ごとの敵の種類数", 1, 20, 1],
  enemy_types_per_region: ["領域が進むごとの種類数の増加", 0, 20, 1],
  min_quizzes_per_enemy: ["敵ごとのクイズ数（下限）", 1, 100, 1],
  max_quizzes_per_enemy: ["敵ごとのクイズ数（上限）", 1, 100, 1],
  min_enemies: ["同時出現数（下限）", 1, 20, 1],
  max_encounter_enemies: ["同時出現数（上限）", 1, 20, 1],
  max_encounter_enemies_per_region: [
    "領域が進むごとの同時出現上限の増加",
    0,
    20,
    1,
  ],
} as const;
const groups = [
  {
    label: "プレイヤーの初期値",
    keys: ["base_hp", "base_attack", "base_defense", "base_seconds"],
  },
  {
    label: "育成ポイントあたりの上昇量",
    keys: [
      "hp_per_point",
      "attack_per_point",
      "defense_per_point",
      "seconds_per_point",
    ],
  },
  {
    label: "敵ステータスの計算",
    description:
      "敵のHP・攻撃力は固定値ではありません。各敵のクイズセットとダンジョンのPowerから導出し、達成度帯が上がるごとに補正します。敵ごとのばらつきはIDに基づいて固定され、設定変更は既存の敵にも即時反映されます。",
    keys: [
      "enemy_hp",
      "enemy_attack",
      "power_hp",
      "power_attack",
      "relation_hp",
      "relation_attack",
      "relation_cap",
      "region_hp",
      "region_attack",
      "enemy_variance_percent",
    ],
  },
  {
    label: "敵ロスターと遭遇の抽選",
    description:
      "母集団クイズを敵の種類に分け、各敵に固定セットとして持たせます。再選出時にクイズの割当てが変わり、戦闘時にはロスターから敵数・敵の種類を抽選します。",
    keys: [
      "enemy_types",
      "enemy_types_per_region",
      "min_quizzes_per_enemy",
      "max_quizzes_per_enemy",
      "min_enemies",
      "max_encounter_enemies",
      "max_encounter_enemies_per_region",
    ],
  },
] as const;

export default function BattleSettingsManager() {
  const [settings, setSettings] = useState<BattleSettings>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
        <p className="text-sm text-muted-foreground">
          敵の能力はPower・単文の関係数・領域の補正と、敵ごとの固定された個体差から計算します。種類数と同時出現上限は領域1の値を基準に増加させられます（最大20）。
        </p>
        {saved && <output className="block">ゲーム設定を保存しました</output>}
        {settings && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(undefined);
              setSaved(false);
              if (
                settings.min_quizzes_per_enemy >
                  settings.max_quizzes_per_enemy ||
                settings.min_enemies > settings.max_encounter_enemies
              ) {
                setError("下限は上限以下にしてください。");
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
          >
            <div className="space-y-5">
              {groups.map((group) => (
                <section
                  key={group.label}
                  aria-label={group.label}
                  className="overflow-hidden rounded-lg border"
                >
                  <div className="border-b bg-muted/40 px-4 py-3">
                    <h3 className="font-medium">{group.label}</h3>
                    {"description" in group && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    {group.keys.map((kind) => {
                      const [label, min, max, step] = fields[kind];
                      return (
                        <div
                          key={kind}
                          className="flex min-w-0 items-center justify-between gap-4 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <Label
                              htmlFor={`battle-${kind}`}
                              className="whitespace-normal"
                            >
                              {label}
                            </Label>
                            <span className="mt-1 block text-xs font-normal text-muted-foreground">
                              範囲 {min}–{max}
                            </span>
                          </div>
                          <Input
                            id={`battle-${kind}`}
                            type="number"
                            min={min}
                            max={max}
                            step={step}
                            required
                            disabled={saving}
                            className="w-28 shrink-0"
                            value={settings[kind]}
                            onChange={(event) => {
                              setSettings({
                                ...settings,
                                [kind]: Number(event.target.value),
                              });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <Button disabled={saving} type="submit">
              {saving ? "保存中…" : "保存"}
            </Button>
          </form>
        )}
        {settings && (
          <Simulation
            settings={settings}
            labels={Object.fromEntries(
              Object.entries(fields).map(([key, value]) => [key, value[0]]),
            )}
          />
        )}
      </div>
    </section>
  );
}
