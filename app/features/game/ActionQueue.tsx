import UserAvatar from "~/features/user/UserAvatar";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import EnemyAvatar from "./EnemyAvatar";
import type { CombatContext } from "./battle";
import { enemyDisplayName } from "./battleLabels";
import type { GameSave } from "./domain";

export default function ActionQueue({
  schedule,
  context,
  player,
  playerName = "あなた",
  labels = {},
}: {
  schedule: NonNullable<NonNullable<GameSave["battle"]>["schedule"]>;
  context: CombatContext;
  player?: UserReadPublic;
  playerName?: string;
  labels?: Record<string, string>;
}) {
  return (
    <section aria-label="行動予測" className="min-w-0 space-y-1">
      <p className="text-xs text-muted-foreground">行動予測 →</p>
      <ol
        className="flex h-14 items-center gap-2 overflow-x-auto py-1"
        dir="ltr"
      >
        {schedule.queue
          .filter(
            (entry) =>
              entry.actor_id === "player" ||
              (schedule.enemy_hp[entry.actor_id] ?? 1) > 0,
          )
          .map((entry, index) => {
            const enemy = context.enemies.find((e) => e.id === entry.actor_id);
            const self = entry.actor_id === "player";
            const name = self
              ? playerName
              : enemyDisplayName(
                  enemy?.base_name ?? enemy?.name ?? "敵",
                  labels[entry.actor_id] ?? "",
                );
            return (
              <li
                key={`${index}:${entry.actor_id}`}
                aria-label={`${index + 1}: ${name}`}
                title={name}
                aria-current={
                  index === 0 && schedule.actor_id === entry.actor_id
                    ? "step"
                    : undefined
                }
                className={`relative flex size-11 shrink-0 items-center justify-center rounded-md border p-1 text-xs ${self ? "border-sky-500/40 bg-sky-500/10" : "border-rose-500/30 bg-rose-500/5"} ${index === 0 && schedule.actor_id === entry.actor_id ? "ring-2 ring-amber-400" : ""}`}
              >
                {self ? (
                  <UserAvatar user={player} className="size-10" />
                ) : (
                  <span className="flex size-10 items-center justify-center [&>span]:size-10">
                    <EnemyAvatar identity={entry.actor_id} icon={enemy?.icon} />
                  </span>
                )}
                {!self && labels[entry.actor_id] && (
                  <span className="absolute -right-1 -top-1 rounded bg-background px-1 text-[10px] font-bold">
                    {labels[entry.actor_id]}
                  </span>
                )}
              </li>
            );
          })}
      </ol>
    </section>
  );
}
