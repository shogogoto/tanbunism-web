import { useEffect, useRef, useState } from "react";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPreviewPrompt from "~/features/quiz/QuizPreviewPrompt";
import { Button } from "~/shared/components/ui/button";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import BattleDialog from "./BattleDialog";
import EnemyAvatar from "./EnemyAvatar";
import type { DungeonContent } from "./api";
import {
  type CombatContext,
  type TurnInput,
  type TurnResult,
  gameRequest,
  playerStats,
  remainingHp,
} from "./battle";
import type { GameSave } from "./domain";
import type { GameState } from "./state";

export default function MultiBattle({
  save,
  content,
  context,
  player,
  playerName,
  onSaved,
  onFinished,
  onBusy,
  clockOffset = 0,
}: {
  save: GameSave;
  content: DungeonContent;
  context: CombatContext;
  player?: UserReadPublic;
  playerName?: string;
  onSaved: (state: GameState) => void;
  onFinished: () => Promise<void>;
  onBusy: (busy: boolean) => void;
  clockOffset?: number;
}) {
  const marker = useRef(save.battle);
  if (save.battle) marker.current = save.battle;
  const battle = marker.current;
  const run = save.run;
  const [hp, setHp] = useState<Record<string, number>>(() =>
    Object.fromEntries(context.enemies.map((enemy) => [enemy.id, enemy.hp])),
  );
  useEffect(() => {
    setHp((current) => ({
      ...current,
      ...remainingHp(current, context.enemies),
    }));
  }, [context]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [active, setActive] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<TurnResult>();
  const [retry, setRetry] = useState<TurnInput>();
  const sending = useRef(false);
  const resultEnemies = useRef(battle?.enemies ?? []);
  const resultQuizIndices = useRef(battle?.quizIndices);
  if (!result) {
    resultEnemies.current = battle?.enemies ?? [];
    resultQuizIndices.current = battle?.quizIndices;
  }
  // The turn response already contains its sealed assignments. A background
  // context refresh must never display the previous turn's question meanwhile.
  const quizIndices = result ? resultQuizIndices.current : battle?.quizIndices;
  const live = context.enemies
    .filter((enemy) =>
      (result ? resultEnemies.current : battle?.enemies)?.includes(enemy.id),
    )
    .map((enemy) => ({
      ...enemy,
      quizIndex: quizIndices?.[enemy.id] ?? enemy.quizIndex,
    }));
  const currentHp = remainingHp(hp, live);
  const stats = playerStats(save.allocation, context.balance);
  const remaining = run?.answerDeadline
    ? Math.max(0, Math.ceil((run.answerDeadline - now - clockOffset) / 1000))
    : 0;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  async function submitTurn(retreat = false, input?: TurnInput) {
    if (!battle || !run || sending.current || result) return;
    sending.current = true;
    setBusy(true);
    onBusy(true);
    setError(undefined);
    const request = input ?? {
      battle_id: battle.id,
      turn: battle.turn,
      answers,
      defeated: live
        .filter((enemy) => {
          const quiz = content.quizzes[enemy.quizIndex];
          const selected = answers[enemy.id];
          const correct =
            selected &&
            (quiz.no_correct_option
              ? selected.length === 0
              : quiz.correct.length === selected.length &&
                quiz.correct.every((id) => selected.includes(id)));
          return correct && currentHp[enemy.id] <= stats.attack;
        })
        .map((enemy) => enemy.id),
      retreat,
    };
    try {
      const resolved = await gameRequest<TurnResult>("battle/turn", request);
      setHp(
        Object.fromEntries(
          live.map((enemy) => [
            enemy.id,
            Math.max(
              0,
              currentHp[enemy.id] -
                (resolved.results[enemy.id] ? stats.attack : 0),
            ),
          ]),
        ),
      );
      setResult(resolved);
      setRetry(undefined);
      onSaved(resolved.state);
    } catch (cause) {
      setRetry(request);
      setError(
        cause instanceof Error ? cause.message : "精算できませんでした。",
      );
    } finally {
      sending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  const allConfirmed =
    live.length > 0 && live.every((enemy) => enemy.id in answers);
  // No per-answer requests. Retries use the exact sealed turn payload.
  useEffect(() => {
    if (
      battle &&
      run?.answerDeadline &&
      !result &&
      !retry &&
      (remaining === 0 || allConfirmed)
    )
      void submitTurn();
  });
  if (!battle || !run) return null;
  const displayed = live[active] ?? live[0];
  const enemyPanel = (
    <div
      className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2 space-y-2"
      aria-label="敵一覧"
    >
      <div className="flex flex-wrap gap-1">
        {live.map((enemy, index) => (
          <button
            key={enemy.id}
            type="button"
            aria-label={enemy.name}
            aria-pressed={active === index}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
              event.preventDefault();
              event.stopPropagation();
              const next =
                (index + (event.key === "ArrowRight" ? 1 : -1) + live.length) %
                live.length;
              setActive(next);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("button")
                [next]?.focus();
            }}
            className={`rounded-md border p-1 ${active === index ? "border-primary" : "border-transparent"}`}
          >
            <EnemyAvatar identity={enemy.id} />
            <span className="block text-xs">
              {enemy.id in answers ? "確定" : index + 1}
            </span>
          </button>
        ))}
      </div>
      {displayed && (
        <p className="text-sm tabular-nums">
          {displayed.name}
          <br />
          HP {currentHp[displayed.id]}/{displayed.hp} · 攻 {displayed.attack}
        </p>
      )}
    </div>
  );
  return (
    <BattleDialog
      run={{ ...run, ...stats, hp: Math.min(run.hp, stats.maxHp) }}
      player={player}
      playerName={playerName}
      busy={busy}
      enemyPanel={enemyPanel}
    >
      {error && (
        <div role="alert" className="space-y-2 text-destructive">
          <p>{error}</p>
          {retry && (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void submitTurn(false, retry)}
              >
                精算を再試行
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  onBusy(true);
                  void gameRequest<GameState>("battle/abandon", {}, "POST")
                    .then((state) => {
                      setResult({ state, results: {}, damage: 0 });
                      setRetry(undefined);
                      setError(undefined);
                      onSaved(state);
                    })
                    .catch((cause) => setError(cause.message))
                    .finally(() => {
                      setBusy(false);
                      onBusy(false);
                    });
                }}
              >
                撤退して最新状態を取得
              </Button>
            </>
          )}
        </div>
      )}
      {result ? (
        <div className="space-y-3">
          <output>{save.battleFeedback}</output>
          {Object.keys(result.results).map((id) => {
            const enemy = live.find((item) => item.id === id);
            return (
              enemy && (
                <section key={id} className="rounded-md border p-2 space-y-2">
                  <p>
                    {enemy.name} · {result.results[id] ? "正解" : "不正解"}
                  </p>
                  <QuizPreviewPrompt
                    quiz={content.quizzes[enemy.quizIndex]}
                    showCorrectAnswer
                  />
                </section>
              )
            );
          })}
          <Button
            disabled={busy}
            onClick={() => {
              if (!save.battle) {
                void onFinished();
                return;
              }
              setBusy(true);
              onBusy(true);
              void gameRequest<GameState>("battle/next", {
                battle_id: save.battle.id,
                turn: save.battle.turn,
              })
                .then((state) => {
                  setAnswers({});
                  setActive(0);
                  setResult(undefined);
                  onSaved(state);
                })
                .catch((cause) => setError(cause.message))
                .finally(() => {
                  setBusy(false);
                  onBusy(false);
                });
            }}
          >
            {save.battle ? "次のターン" : "続ける"}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between gap-2 text-sm">
            <span
              role="timer"
              className={remaining <= 10 ? "text-destructive" : ""}
            >
              持ち時間 {remaining}秒
            </span>
            <span>
              回答確定 {Object.keys(answers).length}/{live.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            敵を切り替えて回答。一度確定した答えは変更できません。全問回答か時間切れで一括精算します。
          </p>
          {live.map((enemy, index) => (
            <div
              key={`${enemy.id}:${battle.turn}:${enemy.quizIndex}`}
              hidden={index !== active}
            >
              <QuizAttempt
                quiz={content.quizzes[enemy.quizIndex]}
                compactMobile
                disabled={busy || !!retry || remaining === 0}
                canSubmit={() =>
                  Date.now() + clockOffset < (run.answerDeadline ?? 0)
                }
                onConfirm={(selected) => {
                  setAnswers((current) => ({
                    ...current,
                    [enemy.id]: selected,
                  }));
                  const next = live.findIndex(
                    (candidate) =>
                      candidate.id !== enemy.id && !(candidate.id in answers),
                  );
                  if (next >= 0) setActive(next);
                }}
              />
            </div>
          ))}
          <Button
            variant="outline"
            disabled={busy || !!retry}
            onClick={() => void submitTurn(true)}
          >
            撤退する
          </Button>
        </>
      )}
    </BattleDialog>
  );
}
