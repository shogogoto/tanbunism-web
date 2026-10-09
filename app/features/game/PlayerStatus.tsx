import { Heart, Shield, Swords, UserRound } from "lucide-react";
import type { Run } from "./domain";

export default function PlayerStatus({
  run,
  name = "あなた",
}: { run: Run; name?: string }) {
  return (
    <section
      aria-label="プレイヤー"
      className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 space-y-2"
    >
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <UserRound className="size-4 text-sky-500" />
        {name}
        <span className="text-xs text-muted-foreground">プレイヤー</span>
      </h3>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm tabular-nums">
        <span className="flex items-center gap-1">
          <Heart className="size-4 text-rose-400" />
          HP {run.hp}/{run.maxHp}
        </span>
        <span className="flex items-center gap-1">
          <Swords className="size-4" />攻 {run.attack}
        </span>
        <span className="flex items-center gap-1">
          <Shield className="size-4" />守 {run.defense}
        </span>
      </div>
      <div
        role="progressbar"
        tabIndex={-1}
        aria-label="プレイヤーHP"
        aria-valuenow={run.hp}
        aria-valuemin={0}
        aria-valuemax={run.maxHp}
        className="h-2 overflow-hidden rounded-full bg-sky-500/15"
      >
        <div
          className="h-full bg-sky-500 transition-[width]"
          style={{ width: `${Math.min(100, (run.hp / run.maxHp) * 100)}%` }}
        />
      </div>
    </section>
  );
}
