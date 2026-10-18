import { Heart, WandSparkles } from "lucide-react";
import type { ReactNode } from "react";
import UserAvatar from "~/features/user/UserAvatar";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import type { Run } from "./domain";

export default function PlayerStatus({
  run,
  name = "あなた",
  player,
  compact = false,
  effect,
}: {
  run: Run;
  name?: string;
  player?: UserReadPublic;
  compact?: boolean;
  effect?: ReactNode;
}) {
  if (compact)
    return (
      <div
        aria-label="プレイヤー"
        className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 text-xs tabular-nums"
      >
        <UserAvatar
          user={player}
          className="row-span-2 size-6 shrink-0 self-center"
        />
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 items-center gap-1">
            <Heart className="size-3 shrink-0 text-rose-400" />
            <span className="w-5 shrink-0">HP</span>
            <div
              role="progressbar"
              tabIndex={-1}
              aria-label="プレイヤーHP"
              aria-valuenow={run.hp}
              aria-valuemin={0}
              aria-valuemax={run.maxHp}
              className="h-1.5 min-w-6 flex-1 overflow-hidden rounded-full bg-sky-500/15 sm:min-w-10"
            >
              <div
                className="h-full bg-sky-500"
                style={{
                  width: `${Math.min(100, (run.hp / run.maxHp) * 100)}%`,
                }}
              />
            </div>
            <span className="w-10 shrink-0 text-right">
              {run.hp}/{run.maxHp}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <WandSparkles className="size-3 shrink-0 text-violet-400" />
            <span className="w-5 shrink-0">MP</span>
            <div
              role="progressbar"
              tabIndex={-1}
              aria-label="プレイヤーMP"
              aria-valuenow={run.mp ?? 0}
              aria-valuemin={0}
              aria-valuemax={run.maxMp ?? 0}
              className="h-1.5 min-w-6 flex-1 overflow-hidden rounded-full bg-violet-500/15 sm:min-w-10"
            >
              <div
                className="h-full bg-violet-500"
                style={{
                  width: `${
                    (run.maxMp ?? 0) > 0
                      ? Math.min(100, ((run.mp ?? 0) / (run.maxMp ?? 1)) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="w-10 shrink-0 text-right">
              {run.mp ?? 0}/{run.maxMp ?? 0}
            </span>
          </div>
        </div>
      </div>
    );
  return (
    <section
      aria-label="プレイヤー"
      className="flex flex-col items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-center text-sm tabular-nums"
    >
      <div className="relative size-12">
        <UserAvatar user={player} className="size-12 shrink-0" />
        {effect}
      </div>
      <h3 className="max-w-full truncate font-medium" title={name}>
        {name}
      </h3>
      <p>
        HP {run.hp}/{run.maxHp}
      </p>
      <p>
        MP {run.mp ?? 0}/{run.maxMp ?? 0}
      </p>
      <p>速さ {run.speed ?? 10}</p>
    </section>
  );
}
