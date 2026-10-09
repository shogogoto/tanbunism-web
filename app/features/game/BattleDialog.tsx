import { Swords } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import PlayerStatus from "./PlayerStatus";
import type { Run } from "./domain";

export default function BattleDialog({
  run,
  playerName,
  children,
  busy,
}: { run: Run; playerName?: string; children: ReactNode; busy: boolean }) {
  const [open, setOpen] = useState(true);
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
          className="flex max-h-[92dvh] flex-col overflow-hidden p-3 sm:max-w-3xl sm:p-5"
          data-dashboard-swipe-ignore
        >
          <DialogHeader className="shrink-0 pr-7 text-left">
            <DialogTitle className="flex items-center gap-2">
              <Swords className="size-4" />
              敵と遭遇
            </DialogTitle>
            <DialogDescription className="truncate">
              {run.name} · 第{run.readIds.length}地点
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto space-y-3 pr-1">
            <div className="grid grid-cols-2 gap-2">
              <PlayerStatus run={run} name={playerName} />
              <section
                aria-label="敵"
                className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 space-y-2"
              >
                <h3 className="text-sm font-medium text-rose-500">敵</h3>
                <p className="text-sm tabular-nums">
                  敵HP {run.enemyHp}/{run.enemyMaxHp}
                </p>
                <div
                  role="progressbar"
                  tabIndex={-1}
                  aria-label="敵HP"
                  aria-valuenow={run.enemyHp}
                  aria-valuemin={0}
                  aria-valuemax={run.enemyMaxHp}
                  className="h-2 overflow-hidden rounded-full bg-rose-500/15"
                >
                  <div
                    className="h-full bg-rose-500 transition-[width]"
                    style={{
                      width: `${Math.min(100, (run.enemyHp / run.enemyMaxHp) * 100)}%`,
                    }}
                  />
                </div>
              </section>
            </div>
            {children}
          </div>
          <p className="shrink-0 text-xs text-muted-foreground">
            閉じても制限時間は進みます。
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
