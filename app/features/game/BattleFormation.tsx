import { Crosshair } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import UserAvatar from "~/features/user/UserAvatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/shared/components/ui/popover";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import EnemyAvatar from "./EnemyAvatar";
import Weaknesses from "./Weaknesses";
import type { CombatContext } from "./battle";
import { enemyDisplayName } from "./battleLabels";
import type { Run } from "./domain";

export default function BattleFormation({
  run,
  player,
  playerName = "あなた",
  enemies,
  context,
  labels,
  hp,
  maximum,
  mp,
  maximumMp,
  acting,
  targets,
  effectFor,
}: {
  run: Run;
  player?: UserReadPublic;
  playerName?: string;
  enemies: CombatContext["enemies"];
  context: CombatContext;
  labels: Record<string, string>;
  hp: Record<string, number>;
  maximum?: Record<string, number>;
  mp?: Record<string, number>;
  maximumMp?: Record<string, number>;
  acting?: string | null;
  targets: string[];
  effectFor: (id: string) => ReactNode;
}) {
  const enemyPane = useRef<HTMLElement>(null);
  const actorPresent = enemies.some((enemy) => enemy.id === acting);
  useLayoutEffect(() => {
    if (!acting || !actorPresent) return;
    const pane = enemyPane.current;
    const active = pane?.querySelector<HTMLElement>('[data-active="true"]');
    if (!pane || !active) return;
    const bounds = pane.getBoundingClientRect();
    const target = active.getBoundingClientRect();
    if (target.top < bounds.top) pane.scrollTop += target.top - bounds.top;
    else if (target.bottom > bounds.bottom)
      pane.scrollTop += target.bottom - bounds.bottom;
  }, [acting, actorPresent]);
  function actor(
    id: string,
    name: string,
    current: number,
    max: number,
    icon: ReactNode,
    details: ReactNode,
  ) {
    return (
      <Popover key={id}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={name}
            aria-label={`${name}の詳細`}
            data-battle-actor={id}
            data-active={acting === id || undefined}
            data-target={targets.includes(id) || undefined}
            className={`relative flex w-16 flex-col items-center gap-1 rounded-lg border p-1.5 ${acting === id ? "border-amber-400 ring-2 ring-amber-400 bg-amber-400/10" : "border-transparent hover:border-muted-foreground/40"}`}
          >
            <span className="relative flex size-10 items-center justify-center [&>span]:size-10">
              {icon}
              {effectFor(id)}
            </span>
            {labels[id] && (
              <span className="absolute -right-1 -top-1 rounded bg-background px-1 text-[10px] font-bold ring-1 ring-border">
                {labels[id]}
              </span>
            )}
            {targets.includes(id) && (
              <span
                className="absolute -left-1 -top-1 text-xs text-sky-400"
                aria-label="行動対象"
              >
                <Crosshair className="size-3" />
              </span>
            )}
            <span
              role="progressbar"
              tabIndex={-1}
              aria-label={`${name} HP`}
              aria-valuenow={current}
              aria-valuemin={0}
              aria-valuemax={max}
              className="h-1.5 w-full overflow-hidden rounded bg-muted"
            >
              <span
                className={`block h-full transition-[width] ${id === "player" ? "bg-sky-400" : "bg-rose-400"}`}
                style={{
                  width: `${Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100))}%`,
                }}
              />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2 text-sm">
          <p className="font-semibold">{name}</p>
          <p>
            HP {current}/{max}
          </p>
          {details}
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <section
      aria-label="戦場"
      data-spatial-focus-ignore
      className="grid h-40 shrink-0 grid-cols-2 gap-3 rounded-xl border bg-muted/10 p-2 sm:h-44"
    >
      <section
        ref={enemyPane}
        aria-label="敵一覧"
        className={`grid min-h-0 justify-items-center gap-2 overflow-y-auto border-r pr-2 pt-1 ${enemies.length <= 2 ? "grid-cols-1 content-center" : "grid-cols-2 content-start sm:grid-cols-4"}`}
      >
        {enemies.map((enemy) =>
          actor(
            enemy.id,
            enemyDisplayName(
              enemy.base_name ?? enemy.name,
              labels[enemy.id] ?? "",
            ),
            hp[enemy.id] ?? 0,
            maximum?.[enemy.id] ?? enemy.hp,
            <EnemyAvatar identity={enemy.id} icon={enemy.icon} />,
            <>
              <p>
                MP {mp?.[enemy.id] ?? enemy.mp ?? 0}/
                {maximumMp?.[enemy.id] ?? enemy.mp ?? 0}
              </p>
              <Weaknesses
                ids={enemy.weaknesses}
                resistances={enemy.resistances}
                elements={context.elements}
              />
            </>,
          ),
        )}
      </section>
      <section
        aria-label="味方一覧"
        className="flex min-h-0 items-center justify-center"
      >
        <section aria-label="プレイヤー">
          <span className="sr-only">
            {playerName} HP {run.hp}/{run.maxHp} MP {run.mp ?? 0}/
            {run.maxMp ?? 0}
          </span>
          {actor(
            "player",
            playerName,
            run.hp,
            run.maxHp,
            <UserAvatar user={player} className="size-10" />,
            <p>
              MP {run.mp ?? 0}/{run.maxMp ?? 0}
            </p>,
          )}
        </section>
      </section>
    </section>
  );
}
