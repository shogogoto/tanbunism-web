import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { HotkeyHelpButton } from "~/features/hotkeys/GlobalHotkeys";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPreviewPrompt from "~/features/quiz/QuizPreviewPrompt";
import { Button } from "~/shared/components/ui/button";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import BattleDialog from "./BattleDialog";
import EndTurnAction from "./EndTurnAction";
import EnemyAvatar from "./EnemyAvatar";
import GameIcon from "./GameIcon";
import ScheduledBattle from "./ScheduledBattle";
import SkillEffect from "./SkillEffect";
import type { DungeonContent } from "./api";
import {
  type BattleTransport,
  type CombatContext,
  type GameBalance,
  type TurnInput,
  type TurnResult,
  damageEffect,
  gameRequest,
  playerStats,
  remainingHp,
  rollPlayerDamage,
} from "./battle";
import { playBattleSound, playSkillSound } from "./battleSound";
import type { SkillAnimation } from "./catalog";
import {
  actionDamage,
  effectAmount,
  modifiedStat,
  poisonDamage,
} from "./catalog";
import type { GameSave } from "./domain";
import { musicPreferences } from "./music";
import type { GameState } from "./state";
import useBattleTempo, { type BattleTempo } from "./useBattleTempo";

const hitAnimation = (animation?: SkillAnimation): SkillAnimation =>
  animation && animation !== "none" ? animation : "impact";

export default function MultiBattle(
  props: Parameters<typeof LegacyMultiBattle>[0],
) {
  const scheduled = useRef(Boolean(props.save.battle?.schedule));
  if (props.save.battle?.schedule) scheduled.current = true;
  return scheduled.current ? (
    <ScheduledBattle {...props} />
  ) : (
    <LegacyMultiBattle {...props} />
  );
}

function LegacyMultiBattle({
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
  rollDamage = (attack, balance) => rollPlayerDamage(attack, balance),
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
  transport?: BattleTransport;
  simulation?: boolean;
  syntheticAnswers?: boolean;
  rollDamage?: (attack: number, balance: GameBalance, key: string) => number;
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
  const [simulationChoices, setSimulationChoices] = useState<
    Record<string, "correct" | "incorrect">
  >({});
  const activeAnswerArea = useRef<HTMLDivElement>(null);
  const resultAdvance = useRef<HTMLButtonElement>(null);
  const pendingAnswerFocus = useRef(false);
  const [frozenRemainingMs, setFrozenRemainingMs] = useState<number>();
  const [active, setActive] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<TurnResult>();
  const resultMarker = useRef(save.battle);
  const effectMarker = result ? resultMarker.current : battle;
  const [resultIndex, setResultIndex] = useState(0);
  const processedIndex = useRef(0);
  const resultStartHp = useRef(run?.hp ?? 0);
  const [incomingProcessed, setIncomingProcessed] = useState(0);
  const [poisonEffects, setPoisonEffects] = useState<Record<string, number>>(
    {},
  );
  const tempo = useBattleTempo();
  const [turnDamageByEnemy, setTurnDamageByEnemy] = useState<
    Record<string, number>
  >({});
  const [retry, setRetry] = useState<TurnInput>();
  const [hitEffects, setHitEffects] = useState<
    Record<string, { damage: number; level: number; label: string }>
  >({});
  const sending = useRef(false);
  const settledTurn = useRef<string | undefined>(undefined);
  const retryDamage = useRef<
    { key: string; values: Record<string, number> } | undefined
  >(undefined);
  const turnAttackByEnemy = useRef<Record<string, number>>({});
  const resultEnemies = useRef(battle?.enemies ?? []);
  const resultQuizIndices = useRef(battle?.quizIndices);
  const resultContext = useRef(context);
  if (!result) {
    resultContext.current = context;
    resultEnemies.current = battle?.enemies ?? [];
    resultQuizIndices.current = battle?.quizIndices;
  }
  // The turn response already contains its sealed assignments. A background
  // context refresh must never display the previous turn's question meanwhile.
  const quizIndices = result ? resultQuizIndices.current : battle?.quizIndices;
  const liveIds = result ? resultEnemies.current : (battle?.enemies ?? []);
  const live = (result ? resultContext.current : context).enemies
    .filter((enemy) => liveIds.includes(enemy.id))
    .sort((a, b) => liveIds.indexOf(a.id) - liveIds.indexOf(b.id))
    .map((enemy) => ({
      ...enemy,
      attack: modifiedStat(enemy.attack, effectMarker, enemy.id, "attack"),
      quizIndex: quizIndices?.[enemy.id] ?? enemy.quizIndex,
    }));
  const currentHp = remainingHp(hp, live);
  const resultIds = result ? live.map((enemy) => enemy.id) : [];
  const nextResultId = resultIds[resultIndex];
  const lastActionReceipt = useRef(save.endActionReceipt?.action_id);
  const [actionEffect, setActionEffect] =
    useState<GameSave["endActionReceipt"]>();
  useEffect(() => {
    const receipt = save.endActionReceipt;
    if (
      !receipt ||
      receipt.action_id === lastActionReceipt.current ||
      nextResultId
    )
      return;
    lastActionReceipt.current = receipt.action_id;
    setActionEffect(receipt);
    if (receipt.effect && musicPreferences().enabled)
      playSkillSound({
        effect: receipt.effect,
        sound: receipt.sound,
        animation: receipt.animation ?? undefined,
        ailment: receipt.ailment ?? undefined,
      });
  }, [save.endActionReceipt, nextResultId]);
  const delay =
    context.balance[`battle_tempo_${tempo.tempo}_seconds`] ??
    {
      slow: 3,
      medium: 1,
      fast: 0.5,
    }[tempo.tempo];
  useEffect(() => {
    if (!result || !nextResultId || busy) return;
    const index = processedIndex.current;
    const advance = () => {
      if (processedIndex.current !== index) return;
      if (resultAdvance.current) resultAdvance.current.click();
      else timer = setTimeout(advance, 100);
    };
    let timer = setTimeout(advance, delay * 1000);
    return () => clearTimeout(timer);
  }, [result, nextResultId, busy, delay]);
  const baseStats = playerStats(
    save.allocation,
    context.balance,
    save.economy?.weapon_attack,
  );
  const stats = {
    ...baseStats,
    maxHp: run?.maxHp ?? baseStats.maxHp,
    attack: modifiedStat(baseStats.attack, effectMarker, "player", "attack"),
    defense: modifiedStat(baseStats.defense, effectMarker, "player", "defense"),
  };
  const focusAnswerChoice = useCallback(
    (direction: "first" | "last" = "first") => {
      const selector = syntheticAnswers
        ? "button[data-simulation-option]:not(:disabled)"
        : "button[data-quiz-option-index]:not(:disabled)";
      const choices =
        activeAnswerArea.current?.querySelectorAll<HTMLElement>(selector);
      const choice =
        direction === "first" ? choices?.[0] : choices?.[choices.length - 1];
      choice?.focus();
      return Boolean(choice);
    },
    [syntheticAnswers],
  );
  // Answer buttons are replaced/disabled during confirmation and turn changes.
  // Wait for React to commit the new question instead of racing a paint callback.
  useLayoutEffect(() => {
    if (result && !busy) resultAdvance.current?.focus();
  }, [busy, result]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Active changes commit a different answer area's ref; focus only when explicitly requested.
  useLayoutEffect(() => {
    if (!busy && !result && pendingAnswerFocus.current && focusAnswerChoice()) {
      pendingAnswerFocus.current = false;
    }
  }, [active, busy, result, focusAnswerChoice]);
  const remainingMs =
    frozenRemainingMs ??
    (run?.answerDeadline
      ? Math.max(0, run.answerDeadline - now - clockOffset)
      : undefined);
  const remaining = Math.ceil((remainingMs ?? 0) / 1000);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, []);
  async function submitTurn(retreat = false, input?: TurnInput) {
    if (!battle || !run || sending.current || result) return;
    const damageKey = `${battle.id}:${battle.turn}`;
    if (settledTurn.current === damageKey) return;
    sending.current = true;
    resultMarker.current = structuredClone(battle);
    setBusy(true);
    onBusy(true);
    setError(undefined);
    const correctAnswer = (enemy: (typeof live)[number]) => {
      const quiz = content.quizzes[enemy.quizIndex];
      const selected = (input?.answers ?? answers)[enemy.id];
      return Boolean(
        selected &&
          (quiz.no_correct_option
            ? selected.length === 0
            : quiz.correct.length === selected.length &&
              quiz.correct.every((id) => selected.includes(id))),
      );
    };
    let weaponUses = save.economy?.weapon
      ? (save.economy.remaining_uses?.[save.economy.weapon] ??
        save.economy.weapon_max_uses ??
        30)
      : 0;
    const damageByEnemy =
      retryDamage.current?.key === damageKey
        ? retryDamage.current.values
        : Object.fromEntries(
            live.map((enemy) => {
              const attack = modifiedStat(
                playerStats(
                  save.allocation,
                  context.balance,
                  weaponUses > 0 ? save.economy?.weapon_attack : 0,
                ).attack,
                battle,
                "player",
                "attack",
              );
              turnAttackByEnemy.current[enemy.id] = attack;
              if (correctAnswer(enemy))
                weaponUses = Math.max(0, weaponUses - 1);
              return [
                enemy.id,
                actionDamage(
                  rollDamage(
                    attack,
                    context.balance,
                    `${battle.turn}:${enemy.id}`,
                  ),
                  retreat ? null : battle.gambitAction,
                  enemy.id,
                  battle.enemies[0],
                  attack,
                ),
              ];
            }),
          );
    retryDamage.current = { key: damageKey, values: damageByEnemy };
    const request = input ?? {
      battle_id: battle.id,
      turn: battle.turn,
      answers,
      defeated: live
        .filter((enemy) => {
          return (
            correctAnswer(enemy) &&
            currentHp[enemy.id] <= damageByEnemy[enemy.id]
          );
        })
        .map((enemy) => enemy.id),
      retreat,
    };
    try {
      const resolved = await transport<TurnResult>("battle/turn", request);
      // Parent updates can render before the local result commits. Never
      // auto-submit an already settled turn in that intermediate render.
      settledTurn.current = damageKey;
      setResult(resolved);
      setResultIndex(0);
      processedIndex.current = 0;
      resultStartHp.current = Math.min(
        stats.maxHp,
        run.hp +
          (!request.retreat &&
          battle.gambitAction?.skill.effect === "heal_hp" &&
          Object.values(resolved.results).some(Boolean)
            ? effectAmount(battle.gambitAction.skill, stats.maxHp)
            : 0),
      );
      setIncomingProcessed(0);
      setTurnDamageByEnemy(damageByEnemy);
      setHitEffects({});
      setPoisonEffects({});
      setRetry(undefined);
      retryDamage.current = undefined;
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
  const tempoControl = (
    <div className="flex items-center gap-1">
      <label className="flex items-center" title="戦闘テンポ">
        <select
          aria-label="戦闘テンポ"
          className="h-8 w-14 rounded-md border bg-background px-1 text-sm"
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
      </label>
      <HotkeyHelpButton />
    </div>
  );
  const enemyPanel = (
    <div
      className="shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 space-y-2"
      aria-label="敵一覧"
    >
      <div className="flex flex-wrap items-start justify-evenly gap-2">
        {live.map((enemy, index) => (
          <div
            key={enemy.id}
            aria-label={enemy.name}
            aria-current={!result && active === index ? "step" : undefined}
            className={`flex min-w-0 basis-32 max-w-56 flex-1 flex-col items-center gap-1 rounded-md border p-2 text-center ${!result && active === index ? "border-primary bg-background" : "border-transparent"}`}
          >
            <div className="relative">
              <EnemyAvatar identity={enemy.id} icon={enemy.icon} large />
              {actionEffect?.target_ids?.includes(enemy.id) && (
                <SkillEffect
                  key={actionEffect.action_id}
                  animation={actionEffect.animation ?? "none"}
                  onIcon
                />
              )}
              {result &&
                index === resultIndex - 1 &&
                result.results[enemy.id] &&
                (hitEffects[enemy.id]?.damage ?? 0) > 0 && (
                  <SkillEffect
                    key={`${battle.id}:${battle.turn}:${index}`}
                    animation={hitAnimation(
                      battle.gambitAction?.skill.effect === "attack"
                        ? battle.gambitAction.skill.animation
                        : undefined,
                    )}
                    onIcon
                  />
                )}
            </div>
            <span
              className="max-w-full truncate text-sm font-medium"
              title={enemy.name}
            >
              {enemy.name}
            </span>
            <span
              aria-label={`${enemy.name}のHP`}
              className="text-sm tabular-nums"
            >
              HP {currentHp[enemy.id]}/{enemy.hp}
            </span>
            <span className="text-sm tabular-nums">
              速さ {enemy.speed ?? 10}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <BattleDialog
      playerEffect={
        actionEffect?.target_ids?.includes("player") ? (
          <SkillEffect
            key={actionEffect.action_id}
            animation={actionEffect.animation ?? "none"}
            onIcon
          />
        ) : result &&
          resultIndex > 0 &&
          !result.results[live[resultIndex - 1]?.id] &&
          (result.incoming_damage?.[live[resultIndex - 1]?.id] ?? 0) > 0 ? (
          <SkillEffect
            key={`${battle.id}:${battle.turn}:${resultIndex}`}
            animation={hitAnimation(live[resultIndex - 1]?.animation)}
            onIcon
          />
        ) : undefined
      }
      run={{
        ...run,
        ...stats,
        hp: Math.min(
          result && nextResultId
            ? Math.max(0, resultStartHp.current - incomingProcessed)
            : run.hp,
          stats.maxHp,
        ),
      }}
      player={player}
      playerName={playerName}
      busy={busy}
      enemyPanel={enemyPanel}
      headerControls={tempoControl}
      footer={
        !result && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={busy || !!retry}
              onClick={() => void submitTurn(true)}
            >
              撤退する
            </Button>
            {tempo.error && (
              <p role="alert" className="text-sm text-destructive">
                {tempo.error}
              </p>
            )}
          </div>
        )
      }
      simulation={simulation}
      remainingTimeMs={!result ? remainingMs : undefined}
      totalTimeSeconds={run?.answerSeconds ?? undefined}
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
                  void transport<GameState>("battle/abandon", {}, "POST")
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
        <div className="relative space-y-3" data-battle-result>
          {nextResultId && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              結果 {resultIndex + 1}/{resultIds.length} を処理します
            </p>
          )}
          {tempo.error && (
            <p role="alert" className="text-sm text-destructive">
              {tempo.error}
            </p>
          )}
          {resultIds.map((id, index) => {
            const enemy = live.find((item) => item.id === id);
            const processed = index < resultIndex;
            const correct = result.results[id];
            return (
              enemy && (
                <section
                  key={id}
                  aria-current={index === resultIndex ? "step" : undefined}
                  className={`relative rounded-md border p-3 space-y-2 transition-colors duration-300 ${
                    processed
                      ? correct
                        ? "border-emerald-500/60 bg-emerald-500/10"
                        : "border-rose-500/50 bg-rose-500/10"
                      : index === resultIndex
                        ? "border-primary/70 bg-primary/5"
                        : "border-border opacity-60"
                  }`}
                >
                  <p className="font-medium">
                    {enemy.name} ·{" "}
                    {processed
                      ? correct
                        ? "正解"
                        : id in answers
                          ? "不正解"
                          : "未回答"
                      : "未処理"}
                  </p>
                  {processed && hitEffects[id] && (
                    <p
                      aria-label={
                        correct
                          ? `${enemy.name}へのダメージ`
                          : `${enemy.name}からプレイヤーへのダメージ`
                      }
                      className={`motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2 duration-500 ${
                        [
                          "text-sm text-muted-foreground",
                          "font-medium",
                          "text-lg font-bold text-emerald-500",
                          "text-xl font-black text-amber-500",
                        ][hitEffects[id].level]
                      }`}
                    >
                      {hitEffects[id].label} · {hitEffects[id].damage}ダメージ
                    </p>
                  )}
                  {processed && !simulation && (
                    <QuizPreviewPrompt
                      quiz={content.quizzes[enemy.quizIndex]}
                      showCorrectAnswer
                    />
                  )}
                  {processed && (poisonEffects[id] ?? 0) > 0 && (
                    <p
                      aria-label={`${enemy.name}の毒ダメージ`}
                      className="text-lime-500 font-medium motion-safe:animate-in motion-safe:slide-in-from-top-2"
                    >
                      毒 · {poisonEffects[id]}ダメージ
                    </p>
                  )}
                </section>
              )
            );
          })}
          <div className="flex flex-wrap items-center gap-2">
            {!nextResultId && Boolean(result.player_poison_damage) && (
              <p className="text-lime-500">
                毒 · HP -{result.player_poison_damage}
              </p>
            )}
            {!nextResultId && Boolean(result.curse_damage) && (
              <p className="text-violet-400">
                呪い · MP -{result.curse_damage}
              </p>
            )}
            {!nextResultId && save.battle && Boolean(save.gambits?.length) && (
              <EndTurnAction
                key={`${save.battle.id}:${save.battle.turn}`}
                save={save}
                enemyHp={hp}
                transport={transport}
                clockOffset={clockOffset}
                onSaved={onSaved}
                onBusy={onBusy}
                onDamage={(damage) =>
                  setHp((current) =>
                    Object.fromEntries(
                      Object.entries(current).map(([id, value]) => [
                        id,
                        Math.max(0, value - (damage[id] ?? 0)),
                      ]),
                    ),
                  )
                }
              />
            )}
            <Button
              ref={resultAdvance}
              disabled={
                busy ||
                Boolean(save.battle?.skill) ||
                Boolean(
                  !nextResultId &&
                    save.battle &&
                    save.gambits?.length &&
                    (!save.battle.endActionDone || save.battle.endAction),
                )
              }
              data-battle-advance
              onClick={() => {
                if (nextResultId) {
                  if (processedIndex.current > resultIndex) return;
                  processedIndex.current = resultIndex + 1;
                  const id = nextResultId;
                  if (result.results[id]) {
                    const damage = turnDamageByEnemy[id] ?? 0;
                    const attack =
                      turnAttackByEnemy.current[id] ?? stats.attack;
                    const effect = damageEffect(
                      damage,
                      attack,
                      context.balance,
                      actionDamage(
                        Math.max(
                          attack === 0 ? 0 : 1,
                          Math.floor(
                            attack * context.balance.damage_attack_multiplier,
                          ),
                        ),
                        battle.gambitAction,
                        id,
                        battle.enemies[0],
                        attack,
                      ),
                    );
                    setHp((current) => ({
                      ...current,
                      [id]: Math.max(0, (current[id] ?? 0) - damage),
                    }));
                    setHitEffects((current) => ({
                      ...current,
                      [id]: {
                        damage,
                        ...effect,
                        label:
                          battle.gambitAction?.skill.effect === "attack" &&
                          (battle.gambitAction.skill.target === "all_enemies" ||
                            id === battle.enemies[0])
                            ? `${battle.gambitAction.name} · ${effect.label}`
                            : effect.label,
                      },
                    }));
                    if (musicPreferences().enabled) {
                      const skill = battle.gambitAction?.skill;
                      if (
                        skill &&
                        skill.effect === "attack" &&
                        (skill.target === "all_enemies" ||
                          id === battle.enemies[0])
                      )
                        playSkillSound(skill, true, effect.level);
                      else playBattleSound(true, effect.level);
                    }
                  } else {
                    const damage = result.incoming_damage?.[id];
                    if (damage !== undefined) {
                      setIncomingProcessed((current) => current + damage);
                      setHitEffects((current) => ({
                        ...current,
                        [id]: { damage, level: 1, label: "被ダメージ" },
                      }));
                    }
                    if (musicPreferences().enabled) {
                      const enemy = live.find((e) => e.id === id);
                      if (
                        enemy &&
                        ((enemy.sound && enemy.sound !== "auto") ||
                          (enemy.animation &&
                            enemy.animation !== "none" &&
                            enemy.animation !== "impact"))
                      )
                        playSkillSound(
                          {
                            effect: "attack",
                            sound: enemy.sound,
                            animation: enemy.animation,
                          },
                          false,
                        );
                      else playBattleSound(false);
                    }
                  }
                  const nextIndex = resultIndex + 1;
                  const enemy = live.find((item) => item.id === id);
                  const poison =
                    result.poison_damage?.[id] ??
                    poisonDamage(enemy?.hp ?? 0, effectMarker, id);
                  const hpAfterAttack = Math.max(
                    0,
                    (currentHp[id] ?? 0) -
                      (result.results[id] ? (turnDamageByEnemy[id] ?? 0) : 0),
                  );
                  const tick = Math.min(poison, Math.max(0, hpAfterAttack - 1));
                  if (tick > 0) {
                    setPoisonEffects((current) => ({ ...current, [id]: tick }));
                    setHp((current) => ({
                      ...current,
                      [id]: Math.max(1, (current[id] ?? 0) - tick),
                    }));
                  }
                  setResultIndex(nextIndex);
                  if (nextIndex >= resultIds.length) {
                    if (!result.incoming_damage)
                      setIncomingProcessed(result.damage);
                    onSaved(result.state);
                  }
                  return;
                }
                if (!save.battle) {
                  void onFinished();
                  return;
                }
                setBusy(true);
                onBusy(true);
                void transport<GameState>("battle/next", {
                  battle_id: save.battle.id,
                  turn: save.battle.turn,
                })
                  .then((state) => {
                    pendingAnswerFocus.current = true;
                    setAnswers({});
                    setSimulationChoices({});
                    setFrozenRemainingMs(undefined);
                    setActive(0);
                    setResult(undefined);
                    setResultIndex(0);
                    setTurnDamageByEnemy({});
                    setHitEffects({});
                    setActionEffect(undefined);
                    setPoisonEffects({});
                    onSaved(state);
                  })
                  .catch((cause) => setError(cause.message))
                  .finally(() => {
                    setBusy(false);
                    onBusy(false);
                  });
              }}
            >
              {nextResultId
                ? `結果を処理 · ${resultIndex + 1}/${resultIds.length}`
                : save.battle
                  ? "次のターン"
                  : "続ける"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {(battle.effects ?? []).some(
            (e) => e.starts_turn <= battle.turn && battle.turn < e.expires_turn,
          ) && (
            <ul
              aria-label="戦闘中の効果"
              className="flex flex-wrap gap-2 text-xs"
            >
              {(battle.effects ?? [])
                .filter(
                  (e) =>
                    e.starts_turn <= battle.turn &&
                    battle.turn < e.expires_turn,
                )
                .map((e, i) => (
                  <li
                    key={`${e.skill.id}:${e.target_id}:${e.starts_turn}:${i}`}
                    className="rounded border px-2 py-1"
                  >
                    {e.target_id === "player"
                      ? "自分"
                      : (context.enemies.find(
                          (enemy) => enemy.id === e.target_id,
                        )?.name ?? "敵")}{" "}
                    · {e.skill.name} · あと{e.expires_turn - battle.turn}ターン
                  </li>
                ))}
            </ul>
          )}
          {battle.gambitAction && (
            <p
              className="flex items-center gap-2 text-sm"
              aria-label="このターンの自動行動"
            >
              <GameIcon icon={battle.gambitAction.skill.icon} />
              {battle.gambitAction.name}
              {!battle.gambitAction.item_id &&
                ` · MP ${battle.gambitAction.skill.mp_cost}`}
            </p>
          )}
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">通常の攻防</span>
            <span>
              回答確定 {Object.keys(answers).length}/{live.length}
            </span>
          </div>
          {live.map((enemy, index) => {
            const quiz = content.quizzes[enemy.quizIndex];
            const confirm = (selected: string[]) => {
              if (
                busy ||
                retry ||
                enemy.id in answers ||
                Date.now() + clockOffset >= (run.answerDeadline ?? 0)
              )
                return;
              setAnswers((current) => ({ ...current, [enemy.id]: selected }));
              const completesTurn = live.every(
                (candidate) =>
                  candidate.id === enemy.id || candidate.id in answers,
              );
              if (completesTurn && run.answerDeadline) {
                setFrozenRemainingMs(
                  Math.max(0, run.answerDeadline - Date.now() - clockOffset),
                );
              }
              const next = live.findIndex(
                (candidate) =>
                  candidate.id !== enemy.id && !(candidate.id in answers),
              );
              if (next >= 0) {
                pendingAnswerFocus.current = true;
                setActive(next);
              }
            };
            const correct = quiz.no_correct_option ? [] : quiz.correct;
            const incorrect = correct.length
              ? []
              : [Object.keys(quiz.options)[0]];
            return (
              <div
                key={`${enemy.id}:${battle.turn}:${enemy.quizIndex}`}
                hidden={index !== active}
                ref={index === active ? activeAnswerArea : undefined}
                data-active-answer={index === active ? "" : undefined}
              >
                {syntheticAnswers ? (
                  <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm">
                      模擬回答：正解か不正解を選択してください。
                    </p>
                    <form
                      className="space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const choice = simulationChoices[enemy.id];
                        if (choice)
                          confirm(choice === "correct" ? correct : incorrect);
                      }}
                    >
                      <fieldset className="grid grid-cols-2 gap-2">
                        <legend className="sr-only">模擬回答</legend>
                        {(["correct", "incorrect"] as const).map((choice) => {
                          const selected =
                            simulationChoices[enemy.id] === choice;
                          return (
                            <button
                              key={choice}
                              type="button"
                              data-simulation-option
                              aria-pressed={selected}
                              disabled={
                                busy ||
                                !!retry ||
                                remaining === 0 ||
                                enemy.id in answers
                              }
                              onClick={() =>
                                setSimulationChoices((current) => {
                                  if (current[enemy.id] === choice) {
                                    const next = { ...current };
                                    delete next[enemy.id];
                                    return next;
                                  }
                                  return { ...current, [enemy.id]: choice };
                                })
                              }
                              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
                            >
                              {choice === "correct" ? "正解" : "不正解"}
                            </button>
                          );
                        })}
                      </fieldset>
                      <Button
                        type="submit"
                        data-battle-submit
                        disabled={
                          busy ||
                          !!retry ||
                          remaining === 0 ||
                          enemy.id in answers ||
                          !simulationChoices[enemy.id]
                        }
                      >
                        回答を確定
                      </Button>
                    </form>
                    {enemy.id in answers && (
                      <p className="text-xs text-muted-foreground">
                        回答確定済み
                      </p>
                    )}
                  </div>
                ) : (
                  <QuizAttempt
                    quiz={quiz}
                    compactMobile
                    enterToSubmit
                    keyboardHint={null}
                    allowReport={!simulation}
                    disabled={busy || !!retry || remaining === 0}
                    canSubmit={() =>
                      Date.now() + clockOffset < (run.answerDeadline ?? 0)
                    }
                    onConfirm={confirm}
                  />
                )}
              </div>
            );
          })}
        </>
      )}
    </BattleDialog>
  );
}
