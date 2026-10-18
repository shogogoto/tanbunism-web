import UserAvatar from "~/features/user/UserAvatar";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import EnemyAvatar from "./EnemyAvatar";
import type { CombatContext } from "./battle";
import type { GameSave } from "./domain";

export default function ActionQueue({
  schedule,
  context,
  player,
  playerName = "あなた",
}: {
  schedule: NonNullable<NonNullable<GameSave["battle"]>["schedule"]>;
  context: CombatContext;
  player?: UserReadPublic;
  playerName?: string;
}) {
  return (
    <section aria-label="行動予測" className="min-w-0 space-y-1">
      <p className="text-xs text-muted-foreground">行動予測 →</p>
      <ol className="flex gap-2 overflow-x-auto pb-1" dir="ltr">
        {schedule.queue.map((entry, index) => {
          const enemy = context.enemies.find((e) => e.id === entry.actor_id);
          const self = entry.actor_id === "player";
          const name = self ? playerName : (enemy?.name ?? entry.actor_id);
          return (
            <li
              key={`${index}:${entry.actor_id}`}
              aria-label={`${index + 1}: ${name}`}
              aria-current={
                index === 0 && schedule.actor_id ? "step" : undefined
              }
              className={`flex w-20 shrink-0 flex-col items-center gap-1 rounded-md border p-2 text-xs ${self ? "border-sky-500/40 bg-sky-500/10" : "border-rose-500/30 bg-rose-500/5"} ${index === 0 ? "ring-1 ring-primary" : ""}`}
            >
              {self ? (
                <UserAvatar user={player} className="size-10" />
              ) : (
                <span className="flex size-10 items-center justify-center [&>span]:size-10">
                  <EnemyAvatar identity={entry.actor_id} icon={enemy?.icon} />
                </span>
              )}
              <span className="w-full truncate text-center" title={name}>
                {name}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
