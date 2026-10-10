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
import {
  type BattleSettings,
  type EnemyBalanceSimulation,
  requestBattleSettings,
  requestEnemyBalanceSimulation,
} from "./api";

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
    label: "敵ステータスの計算",
    description:
      "敵のHP・攻撃力は固定値ではありません。各敵のクイズセットとダンジョンのPowerから導出し、達成度帯が上がるごとに補正します。設定変更は既存の敵にも即時反映されます。",
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
    label: "敵ロスターと遭遇の抽選",
    description:
      "母集団クイズを敵の種類に分け、各敵に固定セットとして持たせます。再選出時にクイズの割当てが変わり、戦闘時にはロスターから敵数・敵の種類を抽選します。",
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
  const [samplePower, setSamplePower] = useState(100);
  const [sampleAchievement, setSampleAchievement] = useState(1);
  const [sampleRelations, setSampleRelations] = useState(3);
  const [statsSimulation, setStatsSimulation] =
    useState<EnemyBalanceSimulation>();
  const [rosterSimulation, setRosterSimulation] =
    useState<EnemyBalanceSimulation>();
  const [simulationError, setSimulationError] = useState<string>();
  const [simulating, setSimulating] = useState(false);
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
  const runSimulation = (target: "stats" | "roster") => {
    if (!settings) return;
    setSimulationError(undefined);
    setSimulating(true);
    void requestEnemyBalanceSimulation({
      balance: settings,
      power: samplePower,
      achievement: sampleAchievement,
      average_relations: sampleRelations,
    })
      .then((result) => {
        if (target === "stats") setStatsSimulation(result);
        else setRosterSimulation(result);
      })
      .catch((cause) =>
        setSimulationError(
          cause instanceof Error ? cause.message : "敵を試算できませんでした。",
        ),
      )
      .finally(() => setSimulating(false));
  };
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
          敵の強さはランダム値ではなく、以下の補正値から計算されます。ランダムなのはロスター再選出時のクイズ割当てと、戦闘時の敵・出題クイズの抽選です。
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
          <section
            aria-labelledby="battle-simulation-title"
            className="space-y-4 rounded-lg border p-4 sm:p-5"
          >
            <div>
              <h3 id="battle-simulation-title" className="font-semibold">
                試算条件
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                条件を設定し、敵ステータスと敵ロスターを個別に試算できます。平均関係数は敵ごとに同じ値と仮定します。各結果は条件変更後もこの画面を離れるまで保持されます。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 text-sm">
                <Label htmlFor="simulation-power">ダンジョンのPower</Label>
                <Input
                  id="simulation-power"
                  aria-label="試算するPower"
                  type="number"
                  min={0}
                  max={1000000000}
                  value={samplePower}
                  onChange={(event) => {
                    setSamplePower(Math.max(0, Number(event.target.value)));
                  }}
                />
              </div>
              <div className="space-y-1 text-sm">
                <Label htmlFor="simulation-achievement">達成度</Label>
                <Input
                  id="simulation-achievement"
                  aria-label="試算する達成度"
                  type="number"
                  min={1}
                  max={20}
                  value={sampleAchievement}
                  onChange={(event) => {
                    setSampleAchievement(
                      Math.min(20, Math.max(1, Number(event.target.value))),
                    );
                  }}
                />
              </div>
              <div className="space-y-1 text-sm">
                <Label htmlFor="simulation-relations">
                  敵1体あたりの平均関係数
                </Label>
                <Input
                  id="simulation-relations"
                  aria-label="試算する平均関係数"
                  type="number"
                  min={0}
                  max={1000000}
                  value={sampleRelations}
                  onChange={(event) => {
                    setSampleRelations(Math.max(0, Number(event.target.value)));
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={simulating || !settings}
                onClick={() => runSimulation("stats")}
              >
                {simulating ? "試算中…" : "敵ステータスを試算"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={simulating || !settings}
                onClick={() => runSimulation("roster")}
              >
                {simulating ? "試算中…" : "敵ロスターを試算"}
              </Button>
            </div>
            {simulationError && (
              <p role="alert" className="text-sm text-destructive">
                {simulationError}
              </p>
            )}
            <div className="space-y-4">
              <section
                aria-label="敵ステータス試算"
                className="space-y-3 rounded-md border p-3 sm:p-4"
              >
                <h4 className="font-medium">敵ステータス試算</h4>
                {statsSimulation ? (
                  <div className="overflow-x-auto rounded-md border">
                    <Table
                      aria-label="敵ステータス結果"
                      className="min-w-[52rem]"
                    >
                      <TableHeader>
                        <TableRow>
                          <TableHead>Power</TableHead>
                          <TableHead>達成度</TableHead>
                          <TableHead>平均関係数</TableHead>
                          <TableHead>敵</TableHead>
                          <TableHead>HP</TableHead>
                          <TableHead>攻撃力</TableHead>
                          <TableHead>関係数</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statsSimulation.enemies.map((enemy) => (
                          <TableRow key={enemy.index}>
                            <TableCell>{statsSimulation.power}</TableCell>
                            <TableCell>{statsSimulation.achievement}</TableCell>
                            <TableCell>
                              {statsSimulation.average_relations}
                            </TableCell>
                            <TableCell>敵 {enemy.index}</TableCell>
                            <TableCell>{enemy.hp}</TableCell>
                            <TableCell>{enemy.attack}</TableCell>
                            <TableCell>{enemy.relations}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    条件を入力し、「敵ステータスを試算」を押してください。
                  </p>
                )}
              </section>
              <section
                aria-label="敵ロスター試算"
                className="space-y-3 rounded-md border p-3 sm:p-4"
              >
                <h4 className="font-medium">敵ロスター試算</h4>
                {rosterSimulation ? (
                  <>
                    <div className="overflow-x-auto rounded-md border">
                      <Table
                        aria-label="敵ロスター結果"
                        className="min-w-[64rem]"
                      >
                        <TableHeader>
                          <TableRow>
                            <TableHead>Power</TableHead>
                            <TableHead>達成度</TableHead>
                            <TableHead>平均関係数</TableHead>
                            <TableHead>母集団クイズ数</TableHead>
                            <TableHead>敵の種類</TableHead>
                            <TableHead>固定クイズ数</TableHead>
                            <TableHead>HP</TableHead>
                            <TableHead>攻撃力</TableHead>
                            <TableHead>同時出現数</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rosterSimulation.enemies.map((enemy) => (
                            <TableRow key={enemy.index}>
                              <TableCell>{rosterSimulation.power}</TableCell>
                              <TableCell>
                                {rosterSimulation.achievement}
                              </TableCell>
                              <TableCell>
                                {rosterSimulation.average_relations}
                              </TableCell>
                              <TableCell>
                                {rosterSimulation.pool_quiz_count}
                              </TableCell>
                              <TableCell>敵 {enemy.index}</TableCell>
                              <TableCell>{enemy.quiz_count}問</TableCell>
                              <TableCell>{enemy.hp}</TableCell>
                              <TableCell>{enemy.attack}</TableCell>
                              <TableCell>
                                {rosterSimulation.min_encounter_enemies}〜
                                {rosterSimulation.max_encounter_enemies}体
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      クイズ内容は母集団から再選出されるため、ここでは敵の種類ごとの固定クイズ数を表示します。
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    条件を入力し、「敵ロスターを試算」を押してください。
                  </p>
                )}
              </section>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
