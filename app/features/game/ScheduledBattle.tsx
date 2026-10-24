import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HotkeyHelpButton } from "~/features/hotkeys/GlobalHotkeys";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPreviewPrompt from "~/features/quiz/QuizPreviewPrompt";
import { Button } from "~/shared/components/ui/button";
import ActionQueue from "./ActionQueue";
import BattleDialog from "./BattleDialog";
import EndTurnAction from "./EndTurnAction";
import EnemyAvatar from "./EnemyAvatar";
import type MultiBattle from "./MultiBattle";
import SkillEffect from "./SkillEffect";
import Weaknesses from "./Weaknesses";
import { type TurnInput, type TurnResult, gameRequest } from "./battle";
import { playSkillSound } from "./battleSound";
import type { SkillAnimation } from "./catalog";
import { musicPreferences } from "./music";
import type { GameState } from "./state";
import useBattleTempo, { type BattleTempo } from "./useBattleTempo";

export default function ScheduledBattle({
  save,
  content,
  context,
  player,
  playerName,
  onSaved,
  onFinished,
  onBusy,
  clockOffset = 0,
  transport = gameRequest,
  simulation = false,
  syntheticAnswers = simulation,
}: Parameters<typeof MultiBattle>[0]) {
  const marker = save.battle;
  const encounterIds = useRef(marker?.enemies ?? []);
  const displayMarker = useRef(marker);
  if (marker) displayMarker.current = marker;
  const schedule = marker?.schedule ?? displayMarker.current?.schedule;
  const run = save.run;
  const [now, setNow] = useState(Date.now);
  const [frozenRemaining, setFrozenRemaining] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<TurnResult>();
  const [selection, setSelection] = useState("yes");
  const [retry, setRetry] = useState<TurnInput>();
  const pending = useRef(false);
  const lastResult = useRef<TurnResult | undefined>(undefined);
  const panel = useRef<HTMLDivElement>(null);
  const advanceButton = useRef<HTMLButtonElement>(null);
  const tempo = useBattleTempo();
  const target = schedule?.quiz_enemy_id;
  const enemy = context.enemies.find((e) => e.id === target);
  const quizIndex = target
    ? displayMarker.current?.quizIndices?.[target]
    : undefined;
  const quiz = quizIndex === undefined ? undefined : content.quizzes[quizIndex];
  const feedback = Boolean(save.battleFeedback);
  const remaining =
    frozenRemaining ??
    (!feedback && run?.answerDeadline
      ? Math.max(0, run.answerDeadline - now - clockOffset)
      : undefined);
  const latest = useRef(save);
  latest.current = save;
  useEffect(() => {
    if (feedback || frozenRemaining !== undefined) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [feedback, frozenRemaining]);

  async function submit(selected: string[] | null, retreat = false) {
    if (!marker || !run || pending.current || feedback) return;
    const input: TurnInput = retry ?? {
      battle_id: marker.id,
      turn: marker.turn,
      answers: selected === null || !target ? {} : { [target]: selected },
      defeated: [],
      retreat,
    };
    pending.current = true;
    if (run.answerDeadline)
      setFrozenRemaining(
        Math.max(0, run.answerDeadline - Date.now() - clockOffset),
      );
    setBusy(true);
    onBusy(true);
    setError(undefined);
    try {
      const reply = await transport<TurnResult>("battle/turn", input);
      lastResult.current = reply;
      setResult(reply);
      setRetry(undefined);
      onSaved(reply.state);
      const hitEnemy = Object.values(reply.outgoing_damage ?? {}).some(
        (value) => value > 0,
      );
      if ((hitEnemy || reply.damage > 0) && musicPreferences().enabled)
        playSkillSound({
          effect: "attack",
          sound: "auto",
          animation: hitEnemy
            ? (marker.gambitAction?.skill.animation ?? "impact")
            : (enemy?.animation ?? "impact"),
        });
    } catch (cause) {
      setFrozenRemaining(undefined);
      setRetry(input);
      setError(
        cause instanceof Error ? cause.message : "行動を精算できませんでした。",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }

  async function advance() {
    if (pending.current) return;
    const current = latest.current;
    if (!current.battle) {
      pending.current = true;
      try {
        await onFinished();
      } finally {
        pending.current = false;
      }
      return;
    }
    pending.current = true;
    setBusy(true);
    onBusy(true);
    setError(undefined);
    try {
      const state = await transport<GameState>("battle/next", {
        battle_id: current.battle.id,
        turn: current.battle.turn,
        answers: {},
        defeated: [],
        retreat: false,
      });
      setResult(undefined);
      lastResult.current = undefined;
      setSelection("yes");
      setNow(Date.now());
      setFrozenRemaining(undefined);
      onSaved(state);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "次の行動を開始できませんでした。",
      );
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  useEffect(() => {
    if (remaining === 0 && !busy && !error && !feedback) void submit(null);
  });
  const ready =
    feedback && (!marker || marker.endActionDone) && !marker?.endAction;
  useLayoutEffect(() => {
    if (busy) return;
    if (feedback) advanceButton.current?.focus();
    else
      panel.current
        ?.querySelector<HTMLButtonElement>(
          "button[data-quiz-option-index], button[data-simulation-option]",
        )
        ?.focus();
  }, [busy, feedback]);
  if (!run) return null;
  const shownResult = result ?? lastResult.current;
  const effect: SkillAnimation =
    marker?.gambitAction?.skill.animation ?? "impact";
  const enemyPanel = (
    <div className="min-w-0 shrink-0 space-y-2">
      {schedule && marker && (
        <ActionQueue
          schedule={schedule}
          context={context}
          player={player}
          playerName={playerName}
        />
      )}
      <section
        aria-label="敵一覧"
        className="flex flex-wrap justify-evenly gap-2 rounded-lg border border-rose-500/30 p-2"
      >
        {context.enemies
          .filter((item) => encounterIds.current.includes(item.id))
          .map((item) => (
            <div
              key={item.id}
              className={`flex min-w-0 flex-1 basis-24 flex-col items-center gap-1 rounded-md p-2 text-sm ${schedule?.actor_id === item.id ? "bg-rose-500/10" : ""}`}
            >
              <div className="relative">
                <EnemyAvatar identity={item.id} icon={item.icon} large />
                {(shownResult?.outgoing_damage?.[item.id] ?? 0) > 0 && (
                  <SkillEffect
                    key={shownResult?.state.revision}
                    animation={effect}
                    onIcon
                  />
                )}
              </div>
              <span className="max-w-full truncate">{item.name}</span>
              <Weaknesses
                ids={item.weaknesses}
                resistances={item.resistances}
                elements={context.elements}
              />
              <span className="tabular-nums">
                HP{" "}
                {(marker
                  ? schedule?.enemy_hp[item.id]
                  : shownResult?.enemy_hp?.[item.id]) ?? 0}
                /{schedule?.enemy_max_hp?.[item.id] ?? item.hp}
              </span>
            </div>
          ))}
      </section>
    </div>
  );
  return (
    <BattleDialog
      run={run}
      player={player}
      playerName={playerName}
      busy={busy}
      simulation={simulation}
      enemyPanel={enemyPanel}
      playerEffect={
        shownResult && shownResult.damage > 0 ? (
          <SkillEffect
            key={shownResult.state.revision}
            animation={
              enemy?.animation === "none"
                ? "impact"
                : (enemy?.animation ?? "impact")
            }
            onIcon
          />
        ) : undefined
      }
      remainingTimeMs={remaining}
      totalTimeSeconds={run.answerSeconds ?? undefined}
      headerControls={
        <div className="flex items-center gap-1">
          <select
            aria-label="戦闘テンポ"
            className="h-8 rounded-md border bg-background"
            value={tempo.tempo}
            disabled={tempo.saving}
            onChange={(event) =>
              void tempo.change(event.target.value as BattleTempo)
            }
          >
            <option value="slow">遅</option>
            <option value="medium">中</option>
            <option value="fast">速</option>
          </select>
          <HotkeyHelpButton />
        </div>
      }
      footer={
        !feedback && (
          <Button
            variant="outline"
            disabled={busy || !!retry}
            onClick={() => void submit(null, true)}
          >
            撤退する
          </Button>
        )
      }
    >
      <div
        ref={panel}
        className="space-y-3"
        onKeyDownCapture={(event) => {
          const element = event.target;
          if (
            !(element instanceof HTMLElement) ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            event.repeat
          )
            return;
          if (
            (event.key === " " || event.key === "Enter") &&
            element.matches(
              "button[data-quiz-option-index], button[data-simulation-option]",
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
            if (event.key === " ") element.click();
            else
              panel.current
                ?.querySelector<HTMLButtonElement>(
                  "button[data-quiz-submit]:not(:disabled)",
                )
                ?.click();
          }
        }}
      >
        {error && (
          <div role="alert">
            <p>{error}</p>
            <Button
              disabled={busy}
              onClick={() => (retry ? void submit(null) : void advance())}
            >
              再試行
            </Button>
          </div>
        )}
        {feedback ? (
          <>
            <section
              className="space-y-2 rounded-md border p-3"
              data-battle-result
            >
              <p>{save.battleFeedback}</p>
              {quiz && !syntheticAnswers && (
                <>
                  <QuizPreviewPrompt quiz={quiz} />
                  <p className="text-sm text-emerald-500">
                    答え:{" "}
                    {quiz.correct.map((id) => quiz.options[id]).join("、") ||
                      "該当なし"}
                  </p>
                </>
              )}
            </section>
            {marker && !marker.endActionDone && (
              <EndTurnAction
                key={`${marker.id}:${marker.turn}`}
                save={save}
                enemyHp={schedule?.enemy_hp ?? {}}
                transport={transport}
                clockOffset={clockOffset}
                onSaved={onSaved}
                onDamage={() => undefined}
                onBusy={(value) => {
                  setBusy(value);
                  onBusy(value);
                }}
              />
            )}
            <Button
              ref={advanceButton}
              data-battle-advance
              disabled={busy || !ready}
              onClick={() => void advance()}
            >
              次へ
            </Button>
          </>
        ) : (
          quiz && (
            <>
              <p className="text-sm">
                {schedule?.actor_id === "player"
                  ? `${playerName ?? "あなた"}の${marker?.gambitAction?.name ?? "攻撃"}`
                  : `${enemy?.name ?? "敵"}の攻撃`}
              </p>
              {syntheticAnswers ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["yes", "正解"],
                      ["no", "不正解"],
                    ].map(([value, label]) => (
                      <Button
                        key={value}
                        data-simulation-option
                        aria-pressed={selection === value}
                        variant={selection === value ? "default" : "outline"}
                        disabled={busy || !!retry}
                        onClick={() => setSelection(value)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <Button
                    data-quiz-submit
                    disabled={busy || !!retry}
                    onClick={() => void submit([selection])}
                  >
                    回答を確定
                  </Button>
                </div>
              ) : (
                <QuizAttempt
                  key={`${marker?.id}:${marker?.turn}`}
                  quiz={quiz}
                  compactMobile
                  enterToSubmit
                  keyboardHint={null}
                  allowReport={!simulation}
                  disabled={busy || !!retry || remaining === 0}
                  onConfirm={(selected) => void submit(selected)}
                />
              )}
            </>
          )
        )}
      </div>
    </BattleDialog>
  );
}
