import { type ReactNode, useEffect, useRef, useState } from "react";
import MultiBattle from "~/features/game/MultiBattle";
import type { DungeonContent } from "~/features/game/api";
import {
  type Allocation,
  type BattleTransport,
  type TurnInput,
  emptyAllocation,
  playerStats,
  rollPlayerDamage,
} from "~/features/game/battle";
import UserAvatar from "~/features/user/UserAvatar";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/shared/components/ui/table";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import { type AdminGameDungeon, listAdminGameDungeons } from "../game/api";
import {
  type AdminUserItem,
  getAdminUserGameAllocation,
  listAdminUsers,
} from "../users/api";
import {
  type BattleSettings,
  type EnemyBalanceSimulation,
  type EnemyConditions,
  type PracticeEnemyTrial,
  type PracticeSession,
  requestEnemyBalanceSimulation,
  requestPractice,
  requestPracticeAction,
  requestPracticeNext,
  requestPracticeTurn,
  requestSimulatedPractice,
} from "./api";

type RecordResult = {
  id: string;
  name: string;
  playerName?: string;
  level: number;
  settings: BattleSettings;
  enemyTrial?: EnemyBalanceSimulation;
  allocation: Allocation;
  player: ReturnType<typeof playerStats>;
  outcome: string;
  turns: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  damage: number;
  seconds: number;
};
type Session = PracticeSession & {
  id: string;
  name: string;
  level: number;
  playerName?: string;
  player?: UserReadPublic;
  enemyTrial?: EnemyBalanceSimulation;
};
type Counts = Omit<
  RecordResult,
  | "id"
  | "name"
  | "playerName"
  | "level"
  | "settings"
  | "enemyTrial"
  | "outcome"
  | "allocation"
  | "player"
>;
const newCounts = (): Counts => ({
  turns: 0,
  correct: 0,
  incorrect: 0,
  unanswered: 0,
  damage: 0,
  seconds: 0,
});

/** Stable per-turn, per-instance draws keep the random roll consistent in a run. */
function randomFor(seed: number, key: string) {
  let value = [...`${seed}:${key}`].reduce(
    (hash, c) => Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0,
    2166136261,
  );
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createSeed() {
  return Math.floor(Math.random() * 2_147_483_648);
}

export default function PracticeBattle({
  settings,
  enemyPreview,
  trials = [],
  selectedTrial,
  enemyConditions,
}: {
  settings: BattleSettings;
  enemyPreview?: ReactNode;
  trials?: PracticeEnemyTrial[];
  selectedTrial?: PracticeEnemyTrial;
  enemyConditions?: EnemyConditions;
}) {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [useSavedAllocation, setUseSavedAllocation] = useState(true);
  const [usersError, setUsersError] = useState<string>();
  const [allocation, setAllocation] = useState<Allocation>({
    ...emptyAllocation,
  });
  const [savedAllocation, setSavedAllocation] = useState<Allocation>({
    ...emptyAllocation,
  });
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationError, setAllocationError] = useState<string>();
  const [source, setSource] = useState<"draft" | "trial" | "dungeon">(
    enemyConditions ? "draft" : trials.length ? "trial" : "dungeon",
  );
  const [trialId, setTrialId] = useState(trials[0]?.id ?? "");
  const [dungeons, setDungeons] = useState<AdminGameDungeon[]>([]);
  const [target, setTarget] = useState("");
  const [level, setLevel] = useState(1);
  const [dungeonsLoading, setDungeonsLoading] = useState(true);
  const [dungeonsError, setDungeonsError] = useState<string>();
  const [active, setActive] = useState<Session>();
  const [initial, setInitial] = useState<Session>();
  const [results, setResults] = useState<RecordResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const session = useRef<Session | undefined>(undefined);
  const counts = useRef(newCounts());
  const turnStarted = useRef(Date.now());
  const selectedPlayerId = playerId;
  const selectedPlayer = users.find((user) => user.uid === selectedPlayerId);
  const actualPlayer = !!playerId && useSavedAllocation;
  const draftPlayer = playerStats(
    actualPlayer ? savedAllocation : allocation,
    settings,
  );
  const trial = trials.find((item) => item.id === trialId) ?? trials[0];
  const simulation = trial?.simulation;
  const simulationName = trial?.name;
  const dungeon = dungeons.find(
    (item) => `${item.user_id}:${item.resource_id}` === target,
  );
  const playerProfile = selectedPlayer
    ? {
        uid: selectedPlayer.uid,
        display_name: selectedPlayer.display_name,
        username: selectedPlayer.username,
        avatar_url: selectedPlayer.avatar_url,
        created: selectedPlayer.created,
      }
    : undefined;
  const canStart =
    !busy &&
    !active &&
    !allocationLoading &&
    !allocationError &&
    (source === "draft"
      ? Boolean(
          enemyConditions &&
            Number.isInteger(enemyConditions.power) &&
            enemyConditions.power >= 0 &&
            enemyConditions.power <= 1000000000 &&
            Number.isInteger(enemyConditions.achievement) &&
            enemyConditions.achievement >= 1 &&
            enemyConditions.achievement <= 20,
        )
      : source === "trial"
        ? Boolean(simulation?.enemies.length)
        : Boolean(dungeon?.regions.some((r) => r.level === level)));
  useEffect(() => {
    if (!selectedTrial) return;
    setTrialId(selectedTrial.id);
    setSource("trial");
  }, [selectedTrial]);
  useEffect(() => {
    if (!trials.length && source === "trial" && enemyConditions)
      setSource("draft");
  }, [trials.length, source, enemyConditions]);
  useEffect(() => {
    let mounted = true;
    setAllocationError(undefined);
    if (!playerId) {
      setAllocation({ ...emptyAllocation });
      setSavedAllocation({ ...emptyAllocation });
      setAllocationLoading(false);
      return;
    }
    setAllocationLoading(true);
    void getAdminUserGameAllocation(playerId)
      .then((value) => {
        if (mounted) {
          setAllocation({ ...emptyAllocation, ...value });
          setSavedAllocation({ ...emptyAllocation, ...value });
        }
      })
      .catch((cause) => {
        if (mounted) setAllocationError(cause.message);
      })
      .finally(() => {
        if (mounted) setAllocationLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [playerId]);
  useEffect(() => {
    let mounted = true;
    void listAdminGameDungeons()
      .then((items) => {
        if (!mounted) return;
        const available = items.filter(
          (item) => item.regions.length && item.status !== "母集団あり",
        );
        setDungeons(available);
        if (available[0]) {
          setTarget(`${available[0].user_id}:${available[0].resource_id}`);
          setLevel(available[0].regions[0].level);
        }
      })
      .catch((cause) => {
        if (mounted) setDungeonsError(cause.message);
      })
      .finally(() => {
        if (mounted) setDungeonsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    void listAdminUsers()
      .then((items) => {
        if (mounted) setUsers(items);
      })
      .catch((cause) => {
        if (mounted) setUsersError(cause.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function activate(value: Session) {
    const copy = structuredClone(value);
    copy.id = crypto.randomUUID();
    copy.server_now = Date.now();
    if (copy.state.save.run)
      copy.state.save.run.answerDeadline =
        Date.now() +
        playerStats(copy.state.save.allocation, copy.context.balance)
          .answerSeconds *
          1000;
    session.current = copy;
    counts.current = newCounts();
    turnStarted.current = Date.now();
    setActive(copy);
    setError(undefined);
  }

  async function start() {
    if (!canStart) return;
    setBusy(true);
    setError(undefined);
    try {
      const options = {
        seed: createSeed(),
        balance: { ...settings },
        allocation: actualPlayer ? null : { ...allocation },
        ...(playerId ? { player_user_id: playerId } : {}),
      };
      const enemyTrial =
        source === "draft" && enemyConditions
          ? await requestEnemyBalanceSimulation({
              balance: { ...settings },
              ...enemyConditions,
              average_relations: 0,
            })
          : source === "trial"
            ? simulation
            : undefined;
      const prepared = enemyTrial
        ? await requestSimulatedPractice({ ...options, simulation: enemyTrial })
        : dungeon
          ? await requestPractice({
              ...options,
              user_id: dungeon.user_id,
              resource_id: dungeon.resource_id,
              level,
            })
          : undefined;
      if (!prepared) return;
      const value = {
        ...prepared,
        id: crypto.randomUUID(),
        name: enemyTrial
          ? `${source === "draft" ? "編集中の敵設定" : simulationName} · Power ${enemyTrial.power}`
          : (dungeon?.resource_name ?? "実ダンジョン"),
        playerName:
          selectedPlayer?.display_name ||
          selectedPlayer?.username ||
          selectedPlayer?.email,
        player: playerProfile,
        level: enemyTrial ? enemyTrial.achievement : level,
        enemyTrial: enemyTrial ? structuredClone(enemyTrial) : undefined,
      };
      setInitial(structuredClone(value));
      activate(value);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "模擬戦を準備できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }

  const transport: BattleTransport = async <T,>(
    path: string,
    body?: unknown,
  ): Promise<T> => {
    const current = session.current;
    if (!current?.state.save.battle) throw new Error("模擬戦がありません。");
    if (path === "battle/gambit/start" || path === "battle/gambit/answer") {
      const reply = await requestPracticeAction<{
        state: import("~/features/game/state").GameState;
      }>(current, path.endsWith("/answer"), body);
      session.current = { ...current, state: reply.state };
      return reply as T;
    }
    if (path === "battle/next") {
      const state = await requestPracticeNext(current);
      if (state.save.run)
        state.save.run.answerDeadline =
          Date.now() +
          playerStats(state.save.allocation, current.context.balance)
            .answerSeconds *
            1000;
      session.current = { ...current, state };
      turnStarted.current = Date.now();
      return state as T;
    }
    if (path !== "battle/turn" && path !== "battle/abandon")
      throw new Error("本番の戦闘APIは模擬戦から使用できません。");
    const marker = current.state.save.battle;
    const turn =
      path === "battle/turn"
        ? (body as TurnInput)
        : {
            battle_id: marker.id,
            turn: marker.turn,
            answers: {},
            defeated: [],
            retreat: true,
          };
    const resolved = await requestPracticeTurn(current, turn);
    const total = counts.current;
    total.turns++;
    total.correct += Object.values(resolved.results).filter(Boolean).length;
    total.incorrect += Object.values(resolved.results).filter(
      (correct) => !correct,
    ).length;
    total.unanswered +=
      (marker.schedule ? 1 : marker.enemies.length) -
      Object.keys(turn.answers).length;
    total.damage += resolved.damage;
    total.seconds += Math.min(
      playerStats(current.state.save.allocation, current.context.balance)
        .answerSeconds,
      (Date.now() - turnStarted.current) / 1000,
    );
    session.current = { ...current, state: resolved.state };
    if (!resolved.state.save.battle) {
      setResults((previous) => [
        ...previous,
        {
          ...total,
          id: current.id,
          name: current.name,
          playerName: current.playerName,
          level: current.level,
          settings: { ...current.context.balance },
          enemyTrial: current.enemyTrial,
          allocation: { ...(current.state.save.allocation ?? emptyAllocation) },
          player: playerStats(
            current.state.save.allocation,
            current.context.balance,
          ),
          outcome:
            resolved.state.save.run?.hp === 0
              ? "敗北"
              : turn.retreat
                ? "撤退"
                : "勝利",
        },
      ]);
    }
    return (path === "battle/abandon" ? resolved.state : resolved) as T;
  };

  return (
    <section
      aria-label="実戦形式の模擬戦"
      className="space-y-3 rounded-lg border p-4"
    >
      <h3 className="font-semibold">実戦形式の模擬戦</h3>
      {enemyPreview}
      <div className="space-y-1 text-sm tabular-nums">
        {source === "draft" && enemyConditions && (
          <p>
            編集中の敵設定 · Power {enemyConditions.power} · 領域{" "}
            {enemyConditions.achievement}{" "}
            <a href="#enemy-preview" className="text-primary underline">
              敵の条件・設定へ
            </a>
          </p>
        )}
        {source === "trial" && simulation && (
          <p>
            {simulationName}の敵を固定 · Power {simulation.power} · 領域{" "}
            {simulation.achievement}
          </p>
        )}
        <p>
          プレイヤー: HP {draftPlayer.maxHp} · MP {draftPlayer.maxMp} · 攻{" "}
          {draftPlayer.attack} · 守 {draftPlayer.defense} ·{" "}
          {draftPlayer.answerSeconds}秒
        </p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void start();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="practice-player">プレイヤー</Label>
          <select
            id="practice-player"
            className="h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm"
            value={selectedPlayerId}
            disabled={busy || !!active}
            onChange={(event) => {
              setPlayerId(event.target.value);
              setUseSavedAllocation(true);
            }}
          >
            <option value="">初期値のプレイヤー</option>
            {users.map((user) => (
              <option key={user.uid} value={user.uid}>
                {user.display_name || user.username || user.email}
                {user.display_name || user.username ? ` · ${user.email}` : ""}
              </option>
            ))}
          </select>
          {usersError && (
            <p role="alert" className="text-sm text-destructive">
              {usersError}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <UserAvatar user={playerProfile} />
          <span>
            {selectedPlayer?.display_name ||
              selectedPlayer?.username ||
              selectedPlayer?.email ||
              "模擬プレイヤー"}
          </span>
          {allocationLoading && <span>ポイント読み込み中…</span>}
        </div>
        {selectedPlayer && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useSavedAllocation}
              disabled={busy || !!active}
              onChange={(event) => setUseSavedAllocation(event.target.checked)}
            />
            実プレイヤーの割り振りを使用
          </label>
        )}
        <fieldset
          disabled={
            busy ||
            !!active ||
            allocationLoading ||
            !!allocationError ||
            actualPlayer
          }
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <legend className="mb-2 text-sm">加算ポイント（模擬戦用）</legend>
          {(["hp", "mp", "attack", "defense", "speed"] as const).map((stat) => (
            <div key={stat} className="space-y-1">
              <Label htmlFor={`practice-${stat}`}>
                {
                  {
                    hp: "HPポイント",
                    attack: "攻ポイント",
                    defense: "守ポイント",
                    mp: "MPポイント",
                    speed: "速さポイント",
                  }[stat]
                }
              </Label>
              <Input
                id={`practice-${stat}`}
                type="number"
                min={0}
                max={10000}
                step={1}
                required
                value={actualPlayer ? savedAllocation[stat] : allocation[stat]}
                onChange={(event) =>
                  setAllocation((current) => ({
                    ...current,
                    [stat]: Number(event.target.value),
                  }))
                }
              />
            </div>
          ))}
        </fieldset>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            busy ||
            !!active ||
            allocationLoading ||
            !!allocationError ||
            actualPlayer
          }
          onClick={() => setAllocation({ ...savedAllocation })}
        >
          読み込んだポイントに戻す
        </Button>
        {allocationError && (
          <p role="alert" className="text-sm text-destructive">
            {allocationError}
          </p>
        )}
        <div className="space-y-1">
          <Label htmlFor="practice-source">敵の出典</Label>
          <select
            id="practice-source"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={source}
            disabled={busy || !!active}
            onChange={(event) =>
              setSource(event.target.value as "draft" | "trial" | "dungeon")
            }
          >
            {enemyConditions && (
              <option value="draft">編集中の設定から生成</option>
            )}
            <option value="dungeon">実際のダンジョン</option>
            <option value="trial">比較表の試算から選ぶ（敵を固定）</option>
          </select>
        </div>
        {source === "trial" ? (
          <div className="space-y-1">
            <Label htmlFor="practice-trial">敵の試算</Label>
            <select
              id="practice-trial"
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              disabled={busy || !!active || !trials.length}
              value={trial?.id ?? ""}
              onChange={(event) => setTrialId(event.target.value)}
            >
              {!trials.length && (
                <option value="">
                  敵能力・ロスターの試算結果を選んでください
                </option>
              )}
              {trials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · Power {item.simulation.power} · 領域{" "}
                  {item.simulation.achievement}
                </option>
              ))}
            </select>
          </div>
        ) : source === "dungeon" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="practice-dungeon">ダンジョン</Label>
              <select
                id="practice-dungeon"
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={target}
                disabled={busy || !!active || dungeonsLoading}
                onChange={(event) => {
                  setTarget(event.target.value);
                  const item = dungeons.find(
                    (d) =>
                      `${d.user_id}:${d.resource_id}` === event.target.value,
                  );
                  setLevel(item?.regions[0]?.level ?? 1);
                }}
              >
                {!dungeons.length && (
                  <option value="">
                    {dungeonsLoading
                      ? "読み込み中…"
                      : "準備済みダンジョンがありません"}
                  </option>
                )}
                {dungeons.map((item) => (
                  <option
                    key={`${item.user_id}:${item.resource_id}`}
                    value={`${item.user_id}:${item.resource_id}`}
                  >
                    {item.resource_name} · {item.user_email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="practice-level">領域</Label>
              <select
                id="practice-level"
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={level}
                disabled={busy || !!active || !dungeon}
                onChange={(event) => setLevel(Number(event.target.value))}
              >
                {dungeon?.regions.map((region) => (
                  <option key={region.level} value={region.level}>
                    領域 {region.level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
        {source === "dungeon" && dungeonsError && (
          <p role="alert" className="text-sm text-destructive">
            {dungeonsError}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          ダメージは攻撃ごとに変動します。同じ条件でも試行ごとに結果が変わります。
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!canStart} type="submit">
            現在の設定で模擬戦を開始
          </Button>
          {initial && (
            <Button
              type="button"
              variant="outline"
              disabled={busy || !!active}
              onClick={() => activate({ ...initial, seed: createSeed() })}
            >
              同じ条件で再戦
            </Button>
          )}
          {active && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setActive(undefined);
                session.current = undefined;
              }}
            >
              模擬戦を中止
            </Button>
          )}
        </div>
      </form>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {active && (
        <MultiBattle
          key={active.id}
          simulation
          syntheticAnswers={!!active.enemyTrial}
          save={active.state.save}
          content={active.state.save.content as DungeonContent}
          context={active.context}
          player={active.player}
          playerName={active.playerName ?? "模擬プレイヤー"}
          transport={transport}
          rollDamage={(attack, balance, key) => {
            return rollPlayerDamage(
              attack,
              balance,
              randomFor(active.seed, key),
            );
          }}
          onSaved={(state) => {
            if (session.current) {
              session.current = { ...session.current, state };
              setActive(session.current);
            }
          }}
          onBusy={setBusy}
          onFinished={async () => {
            setActive(undefined);
            session.current = undefined;
          }}
        />
      )}
      {!!results.length && (
        <div className="overflow-x-auto rounded-md border">
          <Table aria-label="模擬戦の比較">
            <TableHeader>
              <TableRow>
                {[
                  "試行",
                  "敵の試算／領域",
                  "プレイヤー",
                  "勝敗",
                  "ターン",
                  "正解",
                  "誤答",
                  "未回答",
                  "被ダメージ",
                  "回答時間",
                  "設定",
                ].map((label) => (
                  <TableHead key={label}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    {r.name}／{r.level}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.playerName && <p>{r.playerName}</p>}
                    HP {r.player.maxHp}／攻 {r.player.attack}／守{" "}
                    {r.player.defense}／{r.player.answerSeconds}秒
                  </TableCell>
                  <TableCell>{r.outcome}</TableCell>
                  <TableCell>{r.turns}</TableCell>
                  <TableCell>{r.correct}</TableCell>
                  <TableCell>{r.incorrect}</TableCell>
                  <TableCell>{r.unanswered}</TableCell>
                  <TableCell>{r.damage}</TableCell>
                  <TableCell>{r.seconds.toFixed(1)}秒</TableCell>
                  <TableCell>
                    <details>
                      <summary>使用した設定</summary>
                      <pre className="text-xs">
                        {JSON.stringify(
                          {
                            balance: r.settings,
                            enemyTrial: r.enemyTrial,
                            allocation: r.allocation,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
