import {
  Heart,
  Minus,
  Plus,
  Shield,
  Swords,
  WandSparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import {
  type Allocation,
  type GameBalance,
  emptyAllocation,
  gameRequest,
  playerStats,
} from "./battle";
import type { GameSave } from "./domain";
import type { GameState } from "./state";

const statDefinitions = [
  {
    key: "hp",
    label: "最大HP",
    Icon: Heart,
    value: (stats: ReturnType<typeof playerStats>) => stats.maxHp,
  },
  {
    key: "mp",
    label: "最大MP",
    Icon: WandSparkles,
    value: (stats: ReturnType<typeof playerStats>) => stats.maxMp,
  },
  {
    key: "attack",
    label: "攻撃力",
    Icon: Swords,
    value: (stats: ReturnType<typeof playerStats>) => stats.attack,
  },
  {
    key: "defense",
    label: "守備力",
    Icon: Shield,
    value: (stats: ReturnType<typeof playerStats>) => stats.defense,
  },
  {
    key: "speed",
    label: "速さ",
    Icon: Zap,
    value: (stats: ReturnType<typeof playerStats>) => stats.speed,
  },
  {
    key: "specialAttack",
    label: "特攻",
    Icon: WandSparkles,
    value: (stats: ReturnType<typeof playerStats>) => stats.specialAttack,
  },
  {
    key: "specialDefense",
    label: "特守",
    Icon: Shield,
    value: (stats: ReturnType<typeof playerStats>) => stats.specialDefense,
  },
] as const;

export default function StatEditor({
  level,
  allocation,
  balance,
  inBattle,
  currentHp,
  weaponAttack,
  equipmentBuffs,
  onPointsChange,
  onSaved,
}: {
  level: number;
  allocation?: Allocation;
  balance: GameBalance;
  inBattle: boolean;
  currentHp?: number;
  weaponAttack?: number;
  equipmentBuffs?: NonNullable<GameSave["economy"]>["equipment_buffs"];
  onPointsChange?: (used: number) => void;
  onSaved: (state: GameState) => void;
}) {
  const [draft, setDraft] = useState({ ...emptyAllocation, ...allocation });
  useEffect(() => {
    setDraft({ ...emptyAllocation, ...allocation });
  }, [allocation]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const budget = Math.max(0, level - 1) * 3;
  const used = Object.values(draft).reduce((sum, n) => sum + n, 0);
  const remaining = Math.max(0, budget - used);
  const stats = playerStats(draft, balance, weaponAttack, equipmentBuffs);
  useEffect(() => onPointsChange?.(used), [onPointsChange, used]);

  function adjust(key: keyof Allocation, amount: number) {
    setDraft((current) => {
      if (
        amount > 0 &&
        Object.values(current).reduce((sum, n) => sum + n, 0) >= budget
      )
        return current;
      if (amount < 0 && (current[key] ?? 0) <= 0) return current;
      return { ...current, [key]: (current[key] ?? 0) + amount };
    });
  }

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
      {inBattle && (
        <output className="text-sm text-muted-foreground">
          戦闘中はステータスを変更できません。
        </output>
      )}

      <fieldset disabled={busy || inBattle} className="grid grid-cols-1 gap-2">
        {statDefinitions.map((definition) => {
          const { key, label, Icon, value } = definition;
          const stat = key as keyof Allocation;
          return (
            <div
              key={key}
              className="flex min-w-0 items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold tabular-nums">
                  {value(stats)}
                </p>
                {key === "hp" && currentHp !== undefined && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    現在HP {Math.min(currentHp, stats.maxHp)}/{stats.maxHp}
                  </p>
                )}
              </div>
              <span
                aria-label={`${draft[stat] ?? 0}ポイント割り振り済み`}
                className="min-w-7 text-center text-sm tabular-nums text-muted-foreground"
                title="割り振りポイント"
              >
                {draft[stat] ?? 0}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`${label}のポイントを減らす`}
                  disabled={(draft[stat] ?? 0) === 0}
                  onClick={() => adjust(stat, -1)}
                >
                  <Minus aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`${label}にポイントを割り振る`}
                  disabled={remaining === 0}
                  onClick={() => adjust(stat, 1)}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
            </div>
          );
        })}
      </fieldset>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={busy || inBattle || used === 0}
          onClick={() => setDraft({ ...emptyAllocation })}
        >
          振り直す
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={busy || inBattle || used > budget}
        >
          {busy ? "保存中…" : "割り振りを保存"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
