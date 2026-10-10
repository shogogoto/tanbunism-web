import { useEffect, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
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
  region_hp: ["領域ごとのHP補正", 0, 100, 1],
  region_attack: ["領域ごとの攻補正", 0, 100, 1],
  max_enemies: ["同時出現数の上限", 1, 20, 1],
  regions_per_enemy: ["敵数が増える領域間隔", 1, 100, 1],
} as const;
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
    <section className="mx-auto max-w-xl space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">ゲームバランス</h2>
      <p className="text-sm text-muted-foreground">
        敵の能力 = 基礎値 + log(1 + Power) × 補正 + 関係数 × 補正 + 領域 ×
        補正（切り上げ）。関係数は上限付き。既存の敵・戦闘中の敵にも反映します。変更の取得は最大30秒ごと。敵の残HPは回復しません。持ち時間はプレイヤー共通で、種類別の重みは使いません。
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {saved && <output className="block">戦闘設定を保存しました</output>}
      {settings && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSaving(true);
            setError(undefined);
            setSaved(false);
            void requestBattleSettings(settings)
              .then((value) => {
                setSettings(value);
                setSaved(true);
              })
              .catch((cause) => setError(cause.message))
              .finally(() => setSaving(false));
          }}
        >
          {Object.entries(fields).map(([key, [label, min, max, step]]) => {
            const kind = key as keyof BattleSettings;
            return (
              <div key={kind} className="space-y-2">
                <Label htmlFor={`battle-${kind}`}>{label}</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id={`battle-${kind}`}
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    required
                    disabled={saving}
                    value={settings[kind]}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        [kind]: Number(event.target.value),
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
          <Button disabled={saving} type="submit">
            {saving ? "保存中…" : "保存"}
          </Button>
        </form>
      )}
    </section>
  );
}
