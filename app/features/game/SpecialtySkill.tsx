import { WandSparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import type { ReadableQuiz } from "~/features/quiz/api";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import { useClock } from "~/shared/hooks/useClock";
import { gameRequest } from "./battle";
import type { GameSave } from "./domain";
import { type Direction, movePanelFocus } from "./spatialFocus";
import type { GameState } from "./state";

type Session = {
  state: GameState;
  skill: NonNullable<NonNullable<GameSave["battle"]>["skill"]>;
  quiz: ReadableQuiz;
};
export type SkillResult = {
  state: GameState;
  correct: boolean;
  outgoing_damage: Record<string, number>;
  damage: number;
};

export default function SpecialtySkill({
  save,
  cost,
  enemyHp,
  clockOffset,
  disabled,
  onSaved,
  onResult,
  onBusy,
}: {
  save: GameSave;
  cost: number;
  enemyHp: Record<string, number>;
  clockOffset: number;
  disabled: boolean;
  onSaved: (state: GameState) => void;
  onResult: (result: SkillResult) => void;
  onBusy: (value: boolean) => void;
}) {
  const [session, setSession] = useState<Session>();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { now } = useClock(Boolean(session));
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sealed = useRef<
    | {
        skill_id: string;
        selected: string[] | null;
        enemy_hp: Record<string, number>;
      }
    | undefined
  >(undefined);
  const answered = useRef(false);
  const marker = save.battle;
  const unlocked = Object.values(save.bossClears ?? {}).some(
    (levels) => levels.length > 0,
  );
  const remaining = session
    ? Math.max(
        0,
        Math.ceil((session.skill.deadline - now - clockOffset) / 1000),
      )
    : 0;
  async function start() {
    if (pending.current || !marker) return;
    if (session && !answered.current) {
      setOpen(true);
      return;
    }
    pending.current = true;
    setBusy(true);
    onBusy(true);
    setError(undefined);
    try {
      const created = await gameRequest<Session>("battle/skill/start", {
        battle_id: marker.id,
        turn: marker.turn,
      });
      answered.current = false;
      sealed.current = undefined;
      setSession(created);
      onSaved(created.state);
      setOpen(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "呼び出せませんでした。",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  async function answer(selected: string[] | null) {
    if (!session || pending.current || answered.current) return;
    pending.current = true;
    setBusy(true);
    onBusy(true);
    setError(undefined);
    const body = sealed.current ?? {
      skill_id: session.skill.id,
      selected,
      enemy_hp: enemyHp,
    };
    sealed.current = body;
    try {
      const result = await gameRequest<SkillResult>(
        "battle/skill/answer",
        body,
      );
      answered.current = true;
      onResult(result);
      setOpen(false);
      setSession(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "精算できませんでした。",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  useEffect(() => {
    if (session && remaining === 0 && !error && !answered.current)
      void answer(null);
  });
  return (
    <>
      <Button
        variant="outline"
        disabled={
          disabled ||
          busy ||
          !marker ||
          !save.run?.hp ||
          !unlocked ||
          (!session && (marker.skillUsed || (save.run?.mp ?? 0) < cost))
        }
        title={
          !unlocked
            ? "ボスを倒すと開放されます"
            : "攻略済みの専門分野からランダムに呼び出します"
        }
        onClick={() => void start()}
      >
        <WandSparkles className="size-4" />
        {session ? "専門分野を開く" : `専門分野 · MP ${cost}`}
      </Button>
      {error && !session && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) setOpen(next);
        }}
      >
        <DialogContent
          ref={contentRef}
          onOpenAutoFocus={(event) => {
            const first = contentRef.current?.querySelector<HTMLButtonElement>(
              "button[data-quiz-option-index]",
            );
            if (first) {
              event.preventDefault();
              first.focus();
            }
          }}
          className="max-h-[92dvh] overflow-y-auto"
          data-dashboard-swipe-ignore
          onKeyDownCapture={(event) => {
            const target = event.target;
            if (
              !(target instanceof HTMLElement) ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              target.closest("input,textarea,select")
            )
              return;
            if (
              event.key === " " &&
              target.matches("button[data-quiz-option-index]")
            ) {
              event.preventDefault();
              event.stopPropagation();
              if (!event.repeat) target.click();
            }
            if (
              event.key === "Enter" &&
              target.matches("button[data-quiz-option-index]")
            ) {
              event.preventDefault();
              event.stopPropagation();
              contentRef.current
                ?.querySelector<HTMLButtonElement>(
                  "button[data-quiz-submit]:not(:disabled)",
                )
                ?.click();
            }
            if (
              event.key.startsWith("Arrow") &&
              movePanelFocus(
                event.currentTarget,
                target,
                event.key as Direction,
              )
            ) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{session?.skill.name ?? "専門分野"}</DialogTitle>
            <DialogDescription>
              正解で全体攻撃 · 不正解・未回答で自分にダメージ
            </DialogDescription>
          </DialogHeader>
          {session && (
            <>
              <p className="text-sm tabular-nums">
                持ち時間 {remaining}秒 · 攻 {session.skill.attack}
              </p>
              <QuizAttempt
                key={session.skill.id}
                quiz={session.quiz}
                compactMobile
                enterToSubmit
                disabled={busy || Boolean(sealed.current) || remaining === 0}
                onConfirm={(selected) => void answer(selected)}
              />
            </>
          )}
          {error && session && (
            <div role="alert" className="space-y-2 text-destructive">
              <p>{error}</p>
              <Button
                disabled={busy}
                onClick={() => void answer(sealed.current?.selected ?? null)}
              >
                精算を再試行
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
