import { useState } from "react";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import {
  type Allocation,
  type GameBalance,
  emptyAllocation,
  gameRequest,
  playerStats,
} from "./battle";
import type { GameState } from "./state";

const labels = { hp: "HP", attack: "攻", defense: "守", seconds: "持ち時間" };
export default function StatEditor({
  level,
  allocation,
  balance,
  inBattle,
  onSaved,
}: {
  level: number;
  allocation?: Allocation;
  balance: GameBalance;
  inBattle: boolean;
  onSaved: (state: GameState) => void;
}) {
  const [draft, setDraft] = useState(allocation ?? emptyAllocation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const budget = Math.max(0, level - 1) * 3;
  const used = Object.values(draft).reduce((sum, n) => sum + n, 0);
  const stats = playerStats(draft, balance);
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError(undefined);
        void gameRequest<GameState>("allocation", draft, "PUT")
          .then(onSaved)
          .catch((cause) => setError(cause.message))
          .finally(() => setBusy(false));
      }}
    >
      <p>
        育成ポイント {budget - used} / {budget}
      </p>
      <p className="text-sm text-muted-foreground">
        Lvごとに3ポイント。能力値は割り振りでのみ上がります。振り直しは無料・HPは回復しません。
      </p>
      <p className="tabular-nums">
        HP {stats.maxHp} · 攻 {stats.attack} · 守 {stats.defense} · 持ち時間{" "}
        {stats.answerSeconds}秒
      </p>
      {inBattle && <output>戦闘中は変更できません。</output>}
      <fieldset disabled={busy || inBattle} className="grid grid-cols-2 gap-3">
        {Object.entries(labels).map(([key, label]) => {
          const stat = key as keyof Allocation;
          return (
            <label
              key={key}
              htmlFor={`allocation-${key}`}
              className="space-y-1"
            >
              {label}
              <Input
                id={`allocation-${key}`}
                type="number"
                min={0}
                max={budget}
                step={1}
                required
                value={draft[stat]}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    [stat]: Math.max(0, Math.trunc(Number(event.target.value))),
                  })
                }
              />
            </label>
          );
        })}
        <Button
          type="button"
          variant="outline"
          onClick={() => setDraft({ ...emptyAllocation })}
        >
          リセット
        </Button>
        <Button type="submit" disabled={used > budget}>
          {busy ? "保存中…" : "割り振りを保存"}
        </Button>
      </fieldset>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
