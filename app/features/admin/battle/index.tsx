import { useEffect, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/shared/components/ui/table";
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
  enemy_types: ["領域ごとの敵の種類数", 1, 20, 1],
  min_quizzes_per_enemy: ["敵ごとのクイズ数（下限）", 1, 100, 1],
  max_quizzes_per_enemy: ["敵ごとのクイズ数（上限）", 1, 100, 1],
  min_enemies: ["同時出現数（下限）", 1, 20, 1],
  max_encounter_enemies: ["同時出現数（上限）", 1, 20, 1],
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
    label: "敵の能力",
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
    ],
  },
  {
    label: "敵ロスターと遭遇数",
    keys: [
      "enemy_types",
      "min_quizzes_per_enemy",
      "max_quizzes_per_enemy",
      "min_enemies",
      "max_encounter_enemies",
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
    <section className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">ゲームバランス</h2>
      <p className="text-sm text-muted-foreground">
        敵の能力 = 基礎値 + log(1 + Power) × 補正 +
        敵の固定クイズセット内の平均関係数 × 補正 + 領域 ×
        補正（切り上げ）。母集団クイズは種類数分の敵へ重複なく割り当て、各敵のクイズセットは固定します。遭遇時は敵ロスターから同時出現数の範囲で抽選し、敵ごとのクイズセットから1問を選びます。関係数は上限付き。既存の敵にも設定変更を即時反映し、残HPは回復しません。
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {saved && <output className="block">ゲーム設定を保存しました</output>}
      {settings && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(undefined);
            setSaved(false);
            if (
              settings.min_quizzes_per_enemy > settings.max_quizzes_per_enemy ||
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
          <Table aria-label="ゲームバランス設定" className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">項目</TableHead>
                <TableHead scope="col" className="w-28">
                  設定値
                </TableHead>
                <TableHead scope="col" className="hidden w-28 sm:table-cell">
                  範囲
                </TableHead>
              </TableRow>
            </TableHeader>
            {groups.map((group) => (
              <TableBody key={group.label}>
                <TableRow className="bg-muted/50">
                  <TableHead colSpan={3} scope="colgroup">
                    {group.label}
                  </TableHead>
                </TableRow>
                {group.keys.map((kind) => {
                  const [label, min, max, step] = fields[kind];
                  return (
                    <TableRow key={kind}>
                      <TableHead scope="row" className="whitespace-normal py-2">
                        <Label htmlFor={`battle-${kind}`}>{label}</Label>
                        <span className="mt-1 block text-xs font-normal text-muted-foreground sm:hidden">
                          {min}–{max}
                        </span>
                      </TableHead>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {min}–{max}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            ))}
          </Table>
          <Button disabled={saving} type="submit">
            {saving ? "保存中…" : "保存"}
          </Button>
        </form>
      )}
    </section>
  );
}
