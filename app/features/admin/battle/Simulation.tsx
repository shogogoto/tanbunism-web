import { useState } from "react";
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
  requestEnemyBalanceSimulation,
} from "./api";

const range = (values: number[]) => {
  if (!values.length) return "—";
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? String(min) : `${min}〜${max}`;
};

export default function Simulation({
  settings,
  labels,
}: {
  settings: BattleSettings;
  labels: Partial<Record<keyof BattleSettings, string>>;
}) {
  const [power, setPower] = useState(100);
  const [achievement, setAchievement] = useState(1);
  const [relations, setRelations] = useState(3);
  const [results, setResults] = useState<
    (EnemyBalanceSimulation & { id: string })[]
  >([]);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const current = results[selected];

  async function simulate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const result = await requestEnemyBalanceSimulation({
        balance: { ...settings },
        power,
        achievement,
        average_relations: relations,
      });
      setSelected(results.length);
      setResults((previous) => [
        ...previous,
        { ...result, id: crypto.randomUUID() },
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "敵を試算できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="敵の試算"
      className="space-y-4 rounded-lg border p-4 sm:p-5"
    >
      <div>
        <h3 className="font-semibold">敵の試算</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          編集中の設定で試算し、条件ごとの結果を比較できます。保存は不要です。結果はこの画面を離れるまで残ります。関係数は各敵で同じ値、個体差はサンプル敵を使います。
        </p>
      </div>
      <form onSubmit={simulate} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "ダンジョンのPower",
              name: "Power",
              value: power,
              setter: setPower,
              min: 0,
              max: 1000000000,
            },
            {
              label: "領域（達成度帯）",
              name: "達成度",
              value: achievement,
              setter: setAchievement,
              min: 1,
              max: 20,
            },
            {
              label: "敵の単文の平均関係数",
              name: "平均関係数",
              value: relations,
              setter: setRelations,
              min: 0,
              max: 1000000,
            },
          ].map((field) => (
            <div className="space-y-1 text-sm" key={field.name}>
              <Label htmlFor={`simulation-${field.name}`}>{field.label}</Label>
              <Input
                id={`simulation-${field.name}`}
                aria-label={`試算する${field.name}`}
                type="number"
                required
                min={field.min}
                max={field.max}
                step={1}
                value={field.value}
                onChange={(event) => field.setter(Number(event.target.value))}
              />
            </div>
          ))}
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "試算中…" : "試算して比較に追加"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {results.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium">条件ごとの比較</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setResults([]);
                setSelected(0);
              }}
            >
              結果をクリア
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table aria-label="試算比較" className="whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>試算</TableHead>
                  <TableHead>Power</TableHead>
                  <TableHead>領域</TableHead>
                  <TableHead>平均関係数</TableHead>
                  <TableHead>ばらつき</TableHead>
                  <TableHead>補正値の変更</TableHead>
                  <TableHead>母集団</TableHead>
                  <TableHead>敵の種類</TableHead>
                  <TableHead>クイズ数 / 敵</TableHead>
                  <TableHead>HP</TableHead>
                  <TableHead>攻撃力</TableHead>
                  <TableHead>同時出現</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow
                    key={result.id}
                    data-state={selected === index ? "selected" : undefined}
                  >
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant={selected === index ? "secondary" : "ghost"}
                        aria-pressed={selected === index}
                        onClick={() => setSelected(index)}
                      >
                        試算 {index + 1}
                      </Button>
                    </TableCell>
                    <TableCell>{result.power}</TableCell>
                    <TableCell>{result.achievement}</TableCell>
                    <TableCell>{result.average_relations}</TableCell>
                    <TableCell>
                      ±{result.balance.enemy_variance_percent}%
                    </TableCell>
                    <TableCell className="min-w-32 max-w-64 whitespace-normal text-xs">
                      {index === 0
                        ? "基準"
                        : Object.entries(labels)
                            .filter(
                              ([key]) =>
                                key !== "enemy_variance_percent" &&
                                result.balance[key as keyof BattleSettings] !==
                                  results[0].balance[
                                    key as keyof BattleSettings
                                  ],
                            )
                            .map(
                              ([key, label]) =>
                                `${label}: ${result.balance[key as keyof BattleSettings]}`,
                            )
                            .join(" / ") || "基準と同じ"}
                    </TableCell>
                    <TableCell>{result.pool_quiz_count}問</TableCell>
                    <TableCell>{result.enemies.length}種類</TableCell>
                    <TableCell>
                      {range(result.enemies.map((enemy) => enemy.quiz_count))}問
                    </TableCell>
                    <TableCell>
                      {range(result.enemies.map((enemy) => enemy.hp))}
                    </TableCell>
                    <TableCell>
                      {range(result.enemies.map((enemy) => enemy.attack))}
                    </TableCell>
                    <TableCell>
                      {result.min_encounter_enemies}〜
                      {result.max_encounter_enemies}体
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {current && (
            <section aria-label="選択した試算の敵" className="space-y-3">
              <h4 className="font-medium">試算 {selected + 1} の敵一覧</h4>
              <details className="rounded-md border p-3 text-sm">
                <summary className="cursor-pointer">
                  この試算に使ったゲームバランス設定
                </summary>
                <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {Object.entries(labels).map(([key, label]) => (
                    <div key={key} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd>{current.balance[key as keyof BattleSettings]}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <div className="overflow-x-auto rounded-md border">
                <Table aria-label="試算の敵一覧">
                  <TableHeader>
                    <TableRow>
                      <TableHead>敵</TableHead>
                      <TableHead>固定クイズ数</TableHead>
                      <TableHead>HP</TableHead>
                      <TableHead>攻撃力</TableHead>
                      <TableHead>関係数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {current.enemies.map((enemy) => (
                      <TableRow key={enemy.index}>
                        <TableCell>敵 {enemy.index}</TableCell>
                        <TableCell>{enemy.quiz_count}問</TableCell>
                        <TableCell>{enemy.hp}</TableCell>
                        <TableCell>{enemy.attack}</TableCell>
                        <TableCell>{enemy.relations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          条件や補正値を変えて試算すると、比較行が追加されます。
        </p>
      )}
    </section>
  );
}
