import { Heart, Shield, Swords } from "lucide-react";
import UserAvatar from "~/features/user/UserAvatar";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import type { Run } from "./domain";

export default function PlayerStatus({
  run,
  name = "あなた",
  player,
  compact = false,
}: { run: Run; name?: string; player?: UserReadPublic; compact?: boolean }) {
  if (compact)
    return (
      <div
        aria-label="プレイヤー"
        className="mt-1 flex items-center gap-2 text-xs tabular-nums"
      >
        <UserAvatar user={player} className="size-6 shrink-0" />
        <Heart className="size-3 text-rose-400" />
        <span>
          HP {run.hp}/{run.maxHp}
        </span>
        <div
          role="progressbar"
          tabIndex={-1}
          aria-label="プレイヤーHP"
          aria-valuenow={run.hp}
          aria-valuemin={0}
          aria-valuemax={run.maxHp}
          className="h-1.5 w-16 overflow-hidden rounded-full bg-sky-500/15"
        >
          <div
            className="h-full bg-sky-500"
            style={{ width: `${Math.min(100, (run.hp / run.maxHp) * 100)}%` }}
          />
        </div>
      </div>
    );
  return (
    <section
      aria-label="プレイヤー"
      className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 space-y-2"
    >
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <UserAvatar user={player} className="size-7 shrink-0" />
        <span className="min-w-0 flex-1 truncate" title={name}>
          {name}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          プレイヤー
        </span>
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
