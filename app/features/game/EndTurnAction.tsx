import { useEffect, useRef, useState } from "react";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import type { ReadableQuiz } from "~/features/quiz/api";
import { Button } from "~/shared/components/ui/button";
import BattleResultMessages from "./BattleResultMessages";
import type { BattleTransport } from "./battle";
import type { GameSave } from "./domain";
import { type Direction, movePanelFocus } from "./spatialFocus";
import type { GameState } from "./state";

type Reply = {
  state: GameState;
  action: NonNullable<GameSave["battle"]>["endAction"];
  quiz: ReadableQuiz | null;
  outgoing_damage: Record<string, number>;
};

export default function EndTurnAction({
  save,
  enemyHp,
  transport,
  clockOffset,
  onSaved,
  onDamage,
  onBusy,
}: {
  save: GameSave;
  enemyHp: Record<string, number>;
  transport: BattleTransport;
  clockOffset: number;
  onSaved: (state: GameState) => void;
  onDamage: (damage: Record<string, number>) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [session, setSession] = useState<Reply>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const pending = useRef(false);
  const started = useRef("");
  const panel = useRef<HTMLDivElement>(null);
  const sealed = useRef<
    { action_id: string; index: number; selected: string[] | null } | undefined
  >(undefined);
  const damageApplied = useRef(false);
  const action = session?.action;
  const remaining = action
    ? Math.max(0, Math.ceil((action.deadline - now - clockOffset) / 1000))
    : 0;
  async function request(answer = false, selected: string[] | null = null) {
    const marker = save.battle;
    if (pending.current || !marker) return;
    pending.current = true;
    setBusy(true);
    onBusy(true);
    setError(undefined);
    try {
      const payload =
        answer && action
          ? (sealed.current ?? {
              action_id: action.id,
              index: action.index,
              selected,
            })
          : { battle_id: marker.id, turn: marker.turn, enemy_hp: enemyHp };
      if (answer && action)
        sealed.current = payload as NonNullable<typeof sealed.current>;
      const reply = await transport<Reply>(
        answer ? "battle/gambit/answer" : "battle/gambit/start",
        payload,
      );
      sealed.current = undefined;
      setSession(reply);
      if (Object.keys(reply.outgoing_damage).length && !damageApplied.current) {
        damageApplied.current = true;
        onDamage(reply.outgoing_damage);
      }
      onSaved(reply.state);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "ガンビットを実行できませんでした。",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  useEffect(() => {
    const marker = save.battle;
    const key = marker ? `${marker.id}:${marker.turn}` : "";
    if (key && key !== started.current && !marker?.endActionDone) {
      started.current = key;
      void request();
    }
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (action && remaining === 0 && !error && !busy) void request(true);
  });
  useEffect(() => {
    if (action && !busy)
      panel.current
        ?.querySelector<HTMLButtonElement>("button[data-quiz-option-index]")
        ?.focus();
  }, [action, busy]);
  useEffect(() => {
    if (session && !action && !busy)
      panel.current
        ?.closest('[role="dialog"]')
        ?.querySelector<HTMLButtonElement>(
          "button[data-battle-advance]:not(:disabled)",
        )
        ?.focus();
  }, [session, action, busy]);
  return (
    <section
      aria-label="ターン終了時のガンビット"
      data-end-turn-action
      className="space-y-2 rounded-lg border p-3"
      ref={panel}
      onKeyDownCapture={(event) => {
        const target = event.target;
        if (
          !(target instanceof HTMLElement) ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        if (
          target.matches("button[data-quiz-option-index]") &&
          (event.key === " " || event.key === "Enter")
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) {
            if (event.key === " ") target.click();
            else
              panel.current
                ?.querySelector<HTMLButtonElement>(
                  "button[data-quiz-submit]:not(:disabled)",
                )
                ?.click();
          }
        }
        if (
          event.key.startsWith("Arrow") &&
          movePanelFocus(event.currentTarget, target, event.key as Direction)
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {action && session?.quiz ? (
        <>
          <p>
            {action.name} · {action.index + 1}/{action.quiz_ids.length}問 ·{" "}
            {remaining}秒
          </p>
          <QuizAttempt
            key={`${action.id}:${action.index}`}
            quiz={session.quiz}
            compactMobile
            enterToSubmit
            disabled={busy || remaining === 0 || Boolean(sealed.current)}
            onConfirm={(selected) => void request(true, selected)}
          />
        </>
      ) : busy ? (
        <p className="text-sm">ガンビットを処理中…</p>
      ) : (
        <BattleResultMessages
          quiz={session?.state.save.quizFeedback}
          battle={session?.state.save.battleFeedback ?? "ガンビット"}
        />
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Button
            disabled={busy}
            onClick={() =>
              void request(Boolean(action), sealed.current?.selected ?? null)
            }
          >
            再試行
          </Button>
        </div>
      )}
    </section>
  );
}
