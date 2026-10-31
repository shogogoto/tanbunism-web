import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HotkeyHelpButton } from "~/features/hotkeys/GlobalHotkeys";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPreviewPrompt from "~/features/quiz/QuizPreviewPrompt";
import { useTanbunPreview } from "~/features/tanbun/detail/Preview";
import { Button } from "~/shared/components/ui/button";
import ActionQueue from "./ActionQueue";
import BattleDialog from "./BattleDialog";
import BattleFormation from "./BattleFormation";
import BattleResultMessages from "./BattleResultMessages";
import EndTurnAction from "./EndTurnAction";
import type MultiBattle from "./MultiBattle";
import SkillEffect from "./SkillEffect";
import { type TurnInput, type TurnResult, gameRequest } from "./battle";
import { enemyDisplayName, enemyLabel } from "./battleLabels";
import type { SoundSkill } from "./battleSound";
import type { SkillAnimation } from "./catalog";
import { musicPreferences } from "./music";
import type { GameState } from "./state";
import useSkillPresentation from "./useSkillPresentation";

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
  const [presentationSkill, setPresentationSkill] = useState<SoundSkill>();
  const [supportTargets, setSupportTargets] = useState<string[]>([]);
  const presentationReady = useSkillPresentation(
    result?.state.revision,
    presentationSkill,
    musicPreferences().enabled,
    true,
    context.balance,
  );
  const [selection, setSelection] = useState("yes");
  const [retry, setRetry] = useState<TurnInput>();
  const pending = useRef(false);
  const lastResult = useRef<TurnResult | undefined>(undefined);
  const panel = useRef<HTMLDivElement>(null);
  const advanceButton = useRef<HTMLButtonElement>(null);
  const { openPreview, preview } = useTanbunPreview();
  const [hideDefeated, setHideDefeated] = useState(false);
  useEffect(() => {
    setHideDefeated(false);
    if (!result || !presentationReady) return;
    const timer = setTimeout(() => setHideDefeated(true), 600);
    return () => clearTimeout(timer);
  }, [result, presentationReady]);
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
      const hitEnemy = Object.values(reply.outgoing_damage ?? {}).some(
        (value) => value > 0,
      );
      const actionSkill =
        schedule?.actor_id === "player"
          ? marker.gambitAction?.skill
          : marker.enemyAction?.skill;
      const selectedAction =
        schedule?.actor_id === "player"
          ? marker.gambitAction
          : marker.enemyAction;
      const correct = Object.values(reply.results).every(Boolean);
      const successful = schedule?.actor_id === "player" ? correct : !correct;
      setSupportTargets(
        actionSkill &&
          actionSkill.effect !== "attack" &&
          (successful || actionSkill.on_wrong?.type === "reduced")
          ? (selectedAction?.target_ids ?? [schedule?.actor_id ?? "player"])
          : [],
      );
      setPresentationSkill(
        actionSkill || hitEnemy || reply.damage > 0
          ? {
              effect: "attack",
              ...actionSkill,
              sound: actionSkill?.sound ?? "auto",
              damage_type: actionSkill?.damage_type ?? "physical",
              animation:
                actionSkill?.animation ??
                (hitEnemy
                  ? (marker.gambitAction?.skill.animation ?? "impact")
                  : (marker.enemyAction?.skill.animation ??
                    enemy?.animation ??
                    "impact")),
            }
          : undefined,
      );
      onSaved(reply.state);
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
    if (feedback) advanceButton.current?.focus({ preventScroll: true });
    else
      panel.current
        ?.querySelector<HTMLButtonElement>(
          "button[data-quiz-option-index], button[data-simulation-option]",
        )
        ?.focus({ preventScroll: true });
  }, [busy, feedback]);
  if (!run) return null;
  const shownResult = result ?? lastResult.current;
  const acting = schedule?.actor_id ?? shownResult?.actor_id ?? null;
  const effect: SkillAnimation =
    presentationSkill?.animation ??
    marker?.gambitAction?.skill.animation ??
    "impact";
  const labels = Object.fromEntries(
    encounterIds.current.map((id) => [
      id,
      enemyLabel(
        id,
        displayMarker.current?.enemyLabels ?? {},
        encounterIds.current,
      ),
    ]),
  );
  const hp = marker
    ? (schedule?.enemy_hp ?? {})
    : (shownResult?.enemy_hp ?? schedule?.enemy_hp ?? {});
  const activeAction =
    acting === "player" ? marker?.gambitAction : marker?.enemyAction;
  const primaryEffects = activeAction?.skill.effects?.length
    ? activeAction.skill.effects
    : activeAction
      ? [activeAction.skill]
      : [];
  const counts = primaryEffects.map(
    (effect) =>
      effect.target_count ?? (effect.target === "all_enemies" ? "all" : 1),
  );
  const targetCount = counts.includes("all")
    ? "all"
    : Math.max(
        1,
        ...counts.filter((value): value is number => typeof value === "number"),
      );
  const targetCandidates =
    acting === "player"
      ? (marker?.gambitAction?.target_ids ?? [target ?? ""])
      : acting
        ? (marker?.enemyAction?.target_ids ?? ["player"])
        : [];
  const actionTargets = targetCandidates.slice(
    0,
    targetCount === "all" ? undefined : targetCount,
  );
  function effectFor(id: string) {
    if (!presentationReady || !shownResult) return undefined;
    const affected =
      id === "player"
        ? shownResult.damage > 0
        : (shownResult.outgoing_damage?.[id] ?? 0) > 0;
    const playerHit =
      marker?.enemyAction?.skill.animation ?? enemy?.animation ?? "impact";
    return affected || supportTargets.includes(id) ? (
      <SkillEffect
        key={shownResult.state.revision}
        animation={
          id === "player" && !supportTargets.includes(id)
            ? playerHit === "none"
              ? "impact"
              : playerHit
            : effect
        }
        onIcon
      />
    ) : undefined;
  }
  const battlefield = (
    <div className="min-w-0 shrink-0 space-y-2">
      <BattleFormation
        run={run}
        player={player}
        playerName={playerName}
        context={context}
        labels={labels}
        hp={hp}
        maximum={schedule?.enemy_max_hp}
        mp={schedule?.enemy_mp}
        maximumMp={schedule?.enemy_max_mp}
        acting={acting}
        targets={actionTargets}
        effectFor={effectFor}
        enemies={encounterIds.current.flatMap((id) => {
          const item = context.enemies.find((enemy) => enemy.id === id);
          return item &&
            ((hp[id] ?? 0) > 0 || (Boolean(shownResult) && !hideDefeated))
            ? [item]
            : [];
        })}
      />
      {schedule && (
        <ActionQueue
          schedule={{ ...schedule, actor_id: acting }}
          context={context}
          player={player}
          playerName={playerName}
          labels={labels}
        />
      )}
    </div>
  );
  return (
    <BattleDialog
      run={run}
      player={player}
      playerName={playerName}
      busy={busy}
      simulation={simulation}
      battlefield={battlefield}
      remainingTimeMs={remaining}
      totalTimeSeconds={run.answerSeconds ?? undefined}
      headerControls={<HotkeyHelpButton />}
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
            <BattleResultMessages
              quiz={save.quizFeedback}
              battle={save.battleFeedback}
              details={save.battleActionDetails}
            >
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
            </BattleResultMessages>
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
            <div className="flex items-center gap-2">
              <Button
                ref={advanceButton}
                data-battle-advance
                disabled={busy || !ready}
                onClick={() => void advance()}
              >
                次へ
              </Button>
              {quiz && !syntheticAnswers && (
                <Button
                  variant="outline"
                  onClick={() =>
                    openPreview({ quizId: quiz.quiz_id, role: "target" })
                  }
                >
                  解説
                </Button>
              )}
            </div>
            {preview}
          </>
        ) : (
          quiz && (
            <>
              <p className="text-sm">
                {schedule?.actor_id === "player"
                  ? `${playerName ?? "あなた"}の${marker?.gambitAction?.name ?? "攻撃"}`
                  : `${enemyDisplayName(enemy?.base_name ?? enemy?.name ?? "敵", labels[enemy?.id ?? ""] ?? "")}の${marker?.enemyAction?.name ?? "攻撃"}`}
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
