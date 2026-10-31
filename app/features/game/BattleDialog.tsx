import { Swords } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import EnemyAvatar from "./EnemyAvatar";
import MusicControls, { useGameMusic } from "./MusicControls";
import PlayerStatus from "./PlayerStatus";
import type { Run } from "./domain";
import { type Direction, movePanelFocus } from "./spatialFocus";

export default function BattleDialog({
  run,
  playerName,
  player,
  children,
  footer,
  headerControls,
  busy,
  enemyPanel,
  battlefield,
  playerEffect,
  simulation = false,
  remainingTimeMs,
  totalTimeSeconds,
}: {
  run: Run;
  playerName?: string;
  player?: UserReadPublic;
  children: ReactNode;
  footer?: ReactNode;
  headerControls?: ReactNode;
  busy: boolean;
  enemyPanel?: ReactNode;
  battlefield?: ReactNode;
  playerEffect?: ReactNode;
  simulation?: boolean;
  remainingTimeMs?: number;
  totalTimeSeconds?: number;
}) {
  const [open, setOpen] = useState(true);
  const content = useRef<HTMLDivElement>(null);
  useGameMusic("battle");
  const timeRatio =
    totalTimeSeconds && remainingTimeMs !== undefined
      ? Math.min(1, Math.max(0, remainingTimeMs / (totalTimeSeconds * 1000)))
      : undefined;
  const timeRemaining = remainingTimeMs ?? 0;
  const signal =
    timeRatio === undefined || timeRatio > 0.5
      ? { text: "text-sky-500", bar: "bg-sky-500" }
      : timeRatio > 0.25
        ? { text: "text-amber-500", bar: "bg-amber-500" }
        : { text: "text-destructive", bar: "bg-destructive" };
  const signalLabel =
    timeRatio === undefined || timeRatio > 0.5
      ? "余裕"
      : timeRatio > 0.25
        ? "注意"
        : "急いで";
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Swords className="size-4" />
        戦闘を開く
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <DialogContent
          ref={content}
          onEscapeKeyDown={(event) => {
            if (!simulation && run.phase === "battle") event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            const target = content.current?.querySelector<HTMLButtonElement>(
              "button[data-quiz-option-index]:not(:disabled), button[data-simulation-option]:not(:disabled), [data-battle-advance]:not(:disabled)",
            );
            event.preventDefault();
            (target ?? content.current)?.focus();
          }}
          className="top-2 flex max-h-[calc(100dvh-1rem)] translate-y-0 flex-col gap-3 overflow-hidden p-3 sm:max-w-5xl sm:p-5"
          data-dashboard-swipe-ignore
          onKeyDownCapture={(event) => {
            const target = event.target;
            if (
              target instanceof HTMLElement &&
              target.closest("[data-end-turn-action]")
            )
              return;
            if (
              target instanceof HTMLElement &&
              target.closest('[role="dialog"]') !== event.currentTarget
            )
              return;
            if (
              event.key === " " &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey &&
              target instanceof HTMLElement
            ) {
              const choice = target.closest<HTMLButtonElement>(
                "button[data-quiz-option-index], button[data-simulation-option]",
              );
              if (choice) {
                // Toggle on keydown: native Space waits for keyup and can lose
                // the click when focus changes during a question transition.
                event.preventDefault();
                event.stopPropagation();
                if (!event.repeat && !choice.disabled) choice.click();
                return;
              }
            }
            if (
              ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                event.key,
              ) &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              target instanceof HTMLElement &&
              target.closest('[role="dialog"]') === event.currentTarget &&
              !target.closest(
                'input, select, textarea, [contenteditable="true"]',
              )
            ) {
              event.preventDefault();
              event.stopPropagation();
              movePanelFocus(
                event.currentTarget,
                target,
                event.key as Direction,
              );
              return;
            }
            if (
              event.key !== "Enter" ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey
            )
              return;
            const root = event.currentTarget;
            if (
              target instanceof HTMLElement &&
              target.closest(
                "[data-battle-advance], [data-battle-submit], button[data-quiz-submit], button:not([data-quiz-option-index]):not([data-simulation-option]), input, select, textarea, a",
              )
            )
              return;
            const advance = root.querySelector<HTMLButtonElement>(
              "[data-battle-result] [data-battle-advance]:not(:disabled)",
            );
            if (advance) {
              event.preventDefault();
              advance.click();
              return;
            }
            const submit = root.querySelector<HTMLButtonElement>(
              "[data-active-answer] [data-battle-submit]:not(:disabled), [data-active-answer] button[data-quiz-submit]:not(:disabled)",
            );
            if (submit) {
              event.preventDefault();
              submit.click();
            } else if (
              target instanceof HTMLElement &&
              target.closest(
                "[data-quiz-option-index], [data-simulation-option]",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <DialogHeader className="shrink-0 pr-36 text-left sm:pr-20">
            <div
              data-spatial-focus-ignore
              className="absolute right-10 top-2 flex items-center gap-1 sm:top-3"
            >
              {headerControls}
              <MusicControls />
            </div>
            <DialogTitle className="flex min-w-0 items-center gap-2">
              <Swords className="size-4" />
              <span className="truncate">
                {simulation ? (
                  <>
                    模擬戦
                    <span className="hidden sm:inline">（保存されません）</span>
                  </>
                ) : (
                  "敵と遭遇"
                )}
              </span>
            </DialogTitle>
            <DialogDescription className="truncate">
              {run.name} · 第{run.readIds.length}地点
            </DialogDescription>
          </DialogHeader>
          <div
            data-battle-scroll
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-3 pr-1"
          >
            {battlefield ?? (
              <>
                <div className="shrink-0">
                  <PlayerStatus
                    run={run}
                    name={playerName}
                    player={player}
                    effect={playerEffect}
                  />
                </div>
                {enemyPanel ?? (
                  <section
                    aria-label="敵"
                    className="flex shrink-0 flex-col items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-center"
                  >
                    <EnemyAvatar
                      identity={run.enemyId ?? `${run.resourceId}:${run.kills}`}
                      large
                    />
                    <h3 className="text-sm font-medium">敵</h3>
                    <p className="text-sm tabular-nums">
                      HP {run.enemyHp}/{run.enemyMaxHp}
                    </p>
                  </section>
                )}
              </>
            )}
            {timeRatio !== undefined && (
              <div
                aria-label="クイズの持ち時間"
                className="shrink-0 space-y-1.5 rounded-md border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3 text-sm tabular-nums">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 rounded-full ${signal.bar}`}
                    />
                    <span>持ち時間</span>
                    <span role="timer" className="font-semibold">
                      {Math.ceil(timeRemaining / 1000)}秒
                    </span>
                  </span>
                  <span className={signal.text}>{signalLabel}</span>
                </div>
                <div
                  role="progressbar"
                  tabIndex={-1}
                  aria-label="残り時間"
                  aria-valuenow={Math.ceil(timeRemaining / 1000)}
                  aria-valuemin={0}
                  aria-valuemax={totalTimeSeconds}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className={`h-full transition-[width,background-color] duration-200 ${signal.bar}`}
                    style={{ width: `${timeRatio * 100}%` }}
                  />
                </div>
              </div>
            )}
            {children}
          </div>
          {footer && (
            <div className="shrink-0 space-y-2 border-t pt-2">{footer}</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
