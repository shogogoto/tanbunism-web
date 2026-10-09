import { BookOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import useSWR, { useSWRConfig } from "swr";
import AuthGuard from "~/features/auth/AuthGuard";
import { useAuth } from "~/features/auth/AuthProvider";
import { useResourceGrowth } from "~/features/gamification/ResourceGrowth";
import { invalidateGamification } from "~/features/gamification/invalidate";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPreviewPrompt from "~/features/quiz/QuizPreviewPrompt";
import { markTanbunSeen } from "~/features/review/api";
import { useTanbunPreview } from "~/features/tanbun/detail/Preview";
import UserAvatar from "~/features/user/UserAvatar";
import Loading from "~/shared/components/Loading";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import { useGetLearningProgressUserUserIdLearningProgressGet } from "~/shared/generated/gamification/gamification";
import BattleDialog from "./BattleDialog";
import ExplorationMap from "./Map";
import PathTerms from "./PathTerms";
import PlayerStatus from "./PlayerStatus";
import { useAdventureAccess } from "./access";
import { loadConnectedKnowledge, loadDungeon } from "./api";
import {
  ENEMIES_TO_CLEAR,
  type GameSave,
  MOVES_PER_EVENT,
  answer,
  enterDungeon,
  move,
  newSave,
  resumeEvent,
} from "./domain";
import {
  ENTRANCE,
  dungeonMap,
  explore,
  knownKnowledge,
  neighbours,
  parkDungeon,
} from "./exploration";
import { requestGameState } from "./state";
import { readGameSave } from "./storage";

export default function Game() {
  const { user } = useAuth();
  return (
    <AuthGuard>
      {user && (
        <GamePlay
          key={user.uid}
          userId={user.uid}
          player={user}
          playerName={user.display_name || user.username || undefined}
        />
      )}
    </AuthGuard>
  );
}

export function GamePlay({
  userId,
  playerName,
  player,
}: { userId: string; playerName?: string; player?: UserReadPublic }) {
  const [save, setSave] = useState<GameSave>(newSave);
  const [ready, setReady] = useState(false);
  const [stateLoaded, setStateLoaded] = useState(false);
  const revision = useRef(0);
  const { menu: routeMenu } = useParams();
  const menu = routeMenu ?? "adventure";
  const navigate = useNavigate();
  const [showDestinations, setShowDestinations] = useState(false);
  const [legacy, setLegacy] = useState<GameSave>();
  const [now, setNow] = useState(Date.now);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingMove = useRef(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const answerRequestPending = useRef(false);
  const submittedOnTime = useRef(true);
  const access = useAdventureAccess(userId);
  const { data: growth, error: growthError } = useResourceGrowth();
  useEffect(() => {
    if (!stateLoaded || menu !== "adventure" || save.run || selectedId) return;
    const recommended = [...(growth?.resources ?? [])].sort((a, b) =>
      (a.last_reviewed_on ?? "").localeCompare(b.last_reviewed_on ?? ""),
    )[0];
    if (recommended) setSelectedId(recommended.resource_id);
  }, [stateLoaded, menu, save.run, selectedId, growth]);
  const progress = useGetLearningProgressUserUserIdLearningProgressGet(userId, {
    fetch: { credentials: "include" },
  });
  const level =
    progress.data?.status === 200 ? progress.data.data.level : undefined;
  const { mutate } = useSWRConfig();
  const { openPreview, preview } = useTanbunPreview();
  const run = save.run;
  const resourceId = run?.resourceId ?? selectedId;
  const parked = save.dungeons?.[resourceId];
  const {
    data: loadedContent,
    error: contentError,
    isLoading,
    mutate: retryContent,
  } = useSWR(
    stateLoaded && resourceId && !save.content && !parked?.content
      ? ["game-dungeon", userId, resourceId]
      : null,
    () => loadDungeon(resourceId),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );
  const content = run
    ? (save.content ?? loadedContent)
    : (parked?.content ?? loadedContent);
  const map = run ? dungeonMap(save, run) : undefined;
  const {
    data: connected,
    error: connectionError,
    isLoading: connectionsLoading,
    mutate: retryConnections,
  } = useSWR(
    run && map?.current !== ENTRANCE && run.phase === "path"
      ? ["game-connections", run.resourceId, map?.current]
      : null,
    () => loadConnectedKnowledge(run?.resourceId ?? "", map?.current ?? ""),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const serverNow = access.data
    ? access.data.server_now + Date.now() - access.data.receivedAt
    : Date.now();
  const remainingSeconds = run?.answerDeadline
    ? Math.min(
        run.answerSeconds ?? Number.POSITIVE_INFINITY,
        Math.max(0, Math.ceil((run.answerDeadline - serverNow) / 1000)),
      )
    : undefined;
  useEffect(() => {
    let active = true;
    const reload = () => {
      if (pendingMove.current || answerRequestPending.current) return;
      void requestGameState()
        .then((state) => {
          if (!active) return;
          revision.current = state.revision;
          setSave(state.save);
          setFeedback(state.save.battleFeedback ?? undefined);
          setStateLoaded(true);
          if (!state.revision) {
            const old = readGameSave(userId);
            if (old.run || Object.keys(old.clears).length) setLegacy(old);
          } else setLegacy(undefined);
          setReady(true);
        })
        .catch((cause) => {
          if (active) {
            setError(cause.message);
            setReady(true);
          }
        });
    };
    reload();
    window.addEventListener("focus", reload);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, [userId]);

  const update = useCallback(
    async (next: GameSave, consumeAccess = false) => {
      try {
        const state = await requestGameState({
          revision: revision.current,
          save: next.run ? { ...next, content: next.content ?? content } : next,
          consume_access: consumeAccess,
        });
        revision.current = state.revision;
        setSave(state.save);
        setFeedback(state.save.battleFeedback ?? undefined);
        return state;
      } catch (cause) {
        const latest = await requestGameState();
        revision.current = latest.revision;
        setSave(latest.save);
        setFeedback(latest.save.battleFeedback ?? undefined);
        throw cause;
      }
    },
    [content],
  );
  const settleAnswer = useCallback(
    async (correct: boolean, timedOut = false) => {
      if (pendingMove.current || feedback || run?.phase !== "battle") return;
      pendingMove.current = true;
      setBusy(true);
      setError(undefined);
      const next = answer(save, correct);
      const message = correct
        ? next.run?.enemyHp === 0
          ? "敵を倒した！"
          : `敵に${run.attack}ダメージ！`
        : `${timedOut ? "時間切れ" : "不正解"} · あなたのHP −${run.hp - (next.run?.hp ?? 0)}`;
      try {
        await update({ ...next, battleFeedback: message });
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "戦闘を保存できませんでした。",
        );
      } finally {
        pendingMove.current = false;
        setBusy(false);
      }
    },
    [feedback, run, save, update],
  );
  useEffect(() => {
    // Older snapshots get a server-issued deadline before answers are enabled.
    if (
      run?.phase === "battle" &&
      !feedback &&
      !run.answerDeadline &&
      content &&
      !busy &&
      !error
    ) {
      pendingMove.current = true;
      setBusy(true);
      void update(save)
        .then((state) => {
          if (!state.save.run?.answerDeadline) {
            throw new Error(
              "回答期限を取得できませんでした。サーバーの更新後に再読み込みしてください。",
            );
          }
        })
        .catch((cause) => setError(cause.message))
        .finally(() => {
          pendingMove.current = false;
          setBusy(false);
        });
    }
  }, [run, content, busy, error, feedback, save, update]);
  useEffect(() => {
    if (
      remainingSeconds === 0 &&
      !feedback &&
      !busy &&
      !answerSubmitting &&
      !error
    ) {
      void settleAnswer(false, true);
    }
  }, [remainingSeconds, feedback, busy, answerSubmitting, error, settleAnswer]);
  async function advance(
    sentenceId: string,
    kind: "relation" | "detour" = "detour",
  ) {
    if (pendingMove.current || !run || run.phase !== "path" || !content) return;
    pendingMove.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const explored = explore(save, sentenceId, kind);
      if (explored === save) return;
      if (sentenceId !== ENTRANCE) await markTanbunSeen(sentenceId);
      await update({
        ...move(explored, sentenceId, Math.random()),
        content: knownKnowledge(content, connected ?? []),
      });
      void invalidateGamification(mutate, { preserveData: true }).catch(
        () => undefined,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "見たよを記録できませんでした。",
      );
    } finally {
      pendingMove.current = false;
      setBusy(false);
    }
  }
  async function leave() {
    if (pendingMove.current || answerRequestPending.current) return;
    if (run?.phase === "battle" || feedback) return;
    setBusy(true);
    try {
      await update(parkDungeon(save));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "撤退を保存できませんでした。",
      );
      return;
    } finally {
      setBusy(false);
    }
    setFeedback(undefined);
    setSelectedId("");
    void navigate("/game/adventure");
  }
  async function startEvent() {
    const needsAccess = !parked || parked.run.phase !== "path";
    if (
      !stateLoaded ||
      pendingMove.current ||
      (needsAccess && !access.data?.available) ||
      access.error
    )
      return;
    if (
      run
        ? run.phase !== "rest"
        : !selected ||
          !level ||
          !content?.quizzes.length ||
          !content?.knowledge.length
    )
      return;
    pendingMove.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const entering = run
        ? resumeEvent(save)
        : enterDungeon(
            save,
            selectedId,
            selected?.resource_name ?? "リソース",
            level ?? 1,
          );
      const next =
        entering.run?.phase === "rest" ? resumeEvent(entering) : entering;
      await update(
        { ...next, content: next.content ?? content },
        !parked ||
          parked.run.phase === "rest" ||
          ["defeated", "cleared"].includes(parked.run.phase),
      );
      void access.mutate().catch(() => undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "冒険を開始できませんでした。",
      );
      void access.mutate().catch(() => undefined);
    } finally {
      pendingMove.current = false;
      setBusy(false);
    }
  }
  if (!ready) return <Loading />;
  const remainingMinutes = Math.max(
    0,
    Math.ceil(
      ((access.data?.next_available_at ?? 0) -
        ((access.data?.server_now ?? 0) +
          Math.max(0, now - (access.data?.receivedAt ?? now)))) /
        60_000,
    ),
  );
  const canStart = Boolean(
    stateLoaded &&
      (access.data?.available || parked?.run.phase === "path") &&
      !access.error &&
      !busy,
  );
  const discovered = new Set(map?.places.map((place) => place.id));
  const paths =
    map?.current === ENTRANCE
      ? (content?.knowledge
          .filter((item) => !discovered.has(item.uid))
          .slice(0, 3) ?? [])
      : (connected ?? [])
          .filter(
            (item) =>
              !neighbours(
                map ?? { current: ENTRANCE, places: [], edges: [] },
              ).includes(item.uid),
          )
          .slice(0, 3);
  const detour =
    map?.current !== ENTRANCE && !connectionsLoading && !connectionError
      ? content?.knowledge.find(
          (item) =>
            !discovered.has(item.uid) &&
            !paths.some((path) => path.uid === item.uid),
        )
      : undefined;
  const quiz = content?.quizzes.length
    ? content.quizzes[
        Math.max(0, (run?.quizCursor ?? 0) - (feedback ? 1 : 0)) %
          content.quizzes.length
      ]
    : undefined;
  const resources = [...(growth?.resources ?? [])].sort((a, b) =>
    (a.last_reviewed_on ?? "").localeCompare(b.last_reviewed_on ?? ""),
  );
  const selected = resources.find(
    (resource) => resource.resource_id === selectedId,
  );
  const visitedIds = Array.from(
    new Set([...(save.visitedDungeons ?? []), ...Object.keys(save.clears)]),
  );
  const visited = visitedIds.flatMap((id) => {
    const resource = resources.find((item) => item.resource_id === id);
    return resource ? [resource] : [];
  });

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 p-3 pb-8 sm:p-6">
      <div className="space-y-4">
        {(error || access.error || growthError || progress.error) && (
          <p role="alert" className="text-sm text-destructive">
            {error ??
              access.error?.message ??
              growthError?.message ??
              "プレイヤーのLvを取得できませんでした。"}
          </p>
        )}
        {contentError && (
          <div role="alert" className="space-y-2 text-sm text-destructive">
            <p>{contentError.message}</p>
            <Button variant="outline" onClick={() => void retryContent()}>
              再試行
            </Button>
          </div>
        )}
        {legacy && (
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => {
              setBusy(true);
              void update(legacy)
                .then(() => setLegacy(undefined))
                .catch((cause) => setError(cause.message))
                .finally(() => setBusy(false));
            }}
          >
            この端末の旧冒険を引き継ぐ
          </Button>
        )}
        <div
          className="space-y-4"
          role="tabpanel"
          aria-label={
            menu === "status"
              ? "ステータス"
              : menu === "item"
                ? "アイテム"
                : "冒険"
          }
        >
          {menu === "status" ? (
            <div className="rounded-lg border p-4 space-y-3">
              <h2 className="font-semibold">ステータス</h2>
              <div className="flex items-center gap-2">
                <UserAvatar user={player} className="size-9 shrink-0" />
                <span className="min-w-0 truncate">
                  {playerName ?? "あなた"}
                </span>
              </div>
              <p>Lv. {level ?? "—"}</p>
              <p>
                HP{" "}
                {run
                  ? `${run.hp}/${run.maxHp}`
                  : level
                    ? `${30 + level * 5}/${30 + level * 5}`
                    : "—"}{" "}
                · 攻 {run?.attack ?? (level ? 8 + level * 2 : "—")} · 守{" "}
                {run?.defense ?? level ?? "—"}
              </p>
              <p>
                ダンジョン攻略{" "}
                {Object.values(save.clears).reduce(
                  (sum, value) => sum + value,
                  0,
                )}
                周
              </p>
            </div>
          ) : menu === "item" ? (
            <div className="rounded-lg border p-4 space-y-2">
              <h2 className="font-semibold">アイテム</h2>
              <p className="text-sm text-muted-foreground">
                まだアイテムはありません。武器・アイテム機能は今後追加予定です。
              </p>
            </div>
          ) : !run ? (
            <>
              <p className="text-sm text-muted-foreground">
                知識を読んで進み、クイズの敵と戦う。敵{ENEMIES_TO_CLEAR}
                体でダンジョン攻略。
              </p>
              <section
                className="space-y-2"
                aria-labelledby="visited-dungeon-label"
              >
                <h2 id="visited-dungeon-label" className="text-sm font-medium">
                  過去のダンジョン
                </h2>
                {!stateLoaded || (!growth && !growthError) ? (
                  <p className="text-sm text-muted-foreground">
                    履歴を読み込み中…
                  </p>
                ) : visited.length > 0 ? (
                  <select
                    id="visited-dungeon"
                    aria-labelledby="visited-dungeon-label"
                    className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
                    disabled={busy || !stateLoaded}
                    value={visitedIds.includes(selectedId) ? selectedId : ""}
                    onChange={(event) => {
                      if (event.target.value) setSelectedId(event.target.value);
                    }}
                  >
                    <option value="">ダンジョンを選択</option>
                    {visited.map((resource) => (
                      <option
                        key={resource.resource_id}
                        value={resource.resource_id}
                      >
                        {resource.resource_name || "リソース"} · 攻略
                        {save.clears[resource.resource_id] ?? 0}周
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {visitedIds.length > 0
                      ? "参照できるダンジョンがありません。"
                      : "訪問履歴はまだありません。"}
                  </p>
                )}
              </section>
              <Button
                variant="outline"
                onClick={() => setShowDestinations(!showDestinations)}
              >
                行き先を変更する
              </Button>
              {showDestinations && (
                <>
                  <Input
                    aria-label="ダンジョンを絞り込む"
                    data-global-search-input
                    placeholder="リソース名で探す"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {!growth && !growthError && <Loading />}
                  {growth && !resources.length && (
                    <p>
                      リソースがありません。
                      <Link className="underline" to="/import">
                        読書メモをインポート
                      </Link>
                    </p>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {resources
                      .filter((resource) =>
                        (resource.resource_name ?? "")
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((resource) => (
                        <button
                          key={resource.resource_id}
                          type="button"
                          disabled={busy}
                          data-hotkey-item
                          aria-pressed={selectedId === resource.resource_id}
                          onClick={() => setSelectedId(resource.resource_id)}
                          className={`rounded-lg border p-3 text-left outline-none data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-primary ${selectedId === resource.resource_id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <BookOpen className="size-4 shrink-0" />
                            {resource.resource_name || "リソース"}
                          </span>
                          <span className="mt-2 block text-xs text-muted-foreground">
                            Lv.{resource.level} · Power {resource.power} · 攻略{" "}
                            {save.clears[resource.resource_id] ?? 0}周
                          </span>
                        </button>
                      ))}
                  </div>
                </>
              )}
              {selected && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h2 className="font-semibold">{selected.resource_name}</h2>
                  {isLoading ? (
                    <Loading />
                  ) : (
                    content && (
                      <>
                        <p className="text-sm">
                          知識 {content.knowledge.length}件 · 準備済みクイズ{" "}
                          {content.quizzes.length}問
                        </p>
                        {(!content.knowledge.length ||
                          !content.quizzes.length) && (
                          <p className="text-sm text-muted-foreground">
                            冒険には知識と準備済みクイズが必要です。
                            <Link
                              className="underline"
                              to={`/review?resource=${encodeURIComponent(selectedId)}&view=quiz`}
                            >
                              復習でクイズを準備
                            </Link>
                          </p>
                        )}
                        <Button
                          disabled={
                            !canStart ||
                            !level ||
                            !content.knowledge.length ||
                            !content.quizzes.length
                          }
                          onClick={() => void startEvent()}
                        >
                          {parked &&
                          !["cleared", "defeated"].includes(parked.run.phase)
                            ? "現在地から再開"
                            : "ダンジョンに入る"}
                        </Button>
                      </>
                    )
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <p className="text-xs text-muted-foreground">ダンジョン</p>
                <h2 className="font-semibold">{run.name}</h2>
                <p className="text-xs text-muted-foreground">
                  今回の移動 {run.moves}/{MOVES_PER_EVENT} · 撃破 {run.kills}/
                  {ENEMIES_TO_CLEAR}
                </p>
              </div>
              <PlayerStatus run={run} name={playerName} player={player} />
              {map && (
                <ExplorationMap
                  key={run.resourceId}
                  map={map}
                  knowledge={content?.knowledge ?? []}
                  onOpen={(sentenceId) => openPreview({ sentenceId })}
                  onMove={(sentenceId) => void advance(sentenceId)}
                  disabled={busy || Boolean(feedback) || run.phase !== "path"}
                />
              )}
              {isLoading && <Loading />}
              {(feedback || run.phase === "battle") && (
                <BattleDialog
                  run={run}
                  playerName={playerName}
                  player={player}
                  busy={busy || answerSubmitting}
                >
                  {error && (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  {feedback ? (
                    <div className="rounded-lg border p-4 space-y-3">
                      <output className="block">{feedback}</output>
                      {quiz && (
                        <QuizPreviewPrompt quiz={quiz} showCorrectAnswer />
                      )}
                      <Button
                        disabled={busy}
                        onClick={() => {
                          setBusy(true);
                          void update({ ...save, battleFeedback: undefined })
                            .catch((cause) => setError(cause.message))
                            .finally(() => setBusy(false));
                        }}
                      >
                        続ける
                      </Button>
                    </div>
                  ) : quiz ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        正解で敵にダメージ。不正解であなたにダメージ。
                      </p>
                      <div className="flex items-center gap-3 text-sm tabular-nums">
                        <span
                          role="timer"
                          className={
                            remainingSeconds !== undefined &&
                            remainingSeconds <= 10
                              ? "text-destructive"
                              : undefined
                          }
                        >
                          {answerSubmitting
                            ? "回答を送信中"
                            : remainingSeconds === undefined
                              ? "制限時間を準備中…"
                              : `残り ${remainingSeconds}秒`}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-amber-500 transition-[width]"
                            style={{
                              width: `${Math.min(100, ((remainingSeconds ?? 0) / (run.answerSeconds ?? 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <QuizAttempt
                        key={`${run.resourceId}:${run.quizCursor}`}
                        quiz={quiz}
                        compactMobile
                        disabled={
                          busy || !run.answerDeadline || remainingSeconds === 0
                        }
                        canSubmit={() =>
                          Boolean(
                            run.answerDeadline &&
                              (access.data
                                ? access.data.server_now +
                                  Date.now() -
                                  access.data.receivedAt
                                : Date.now()) < run.answerDeadline,
                          )
                        }
                        onSubmittingChange={(submitting) => {
                          answerRequestPending.current = submitting;
                          if (submitting)
                            submittedOnTime.current = Boolean(
                              run.answerDeadline &&
                                (access.data
                                  ? access.data.server_now +
                                    Date.now() -
                                    access.data.receivedAt
                                  : Date.now()) < run.answerDeadline,
                            );
                          setAnswerSubmitting(submitting);
                        }}
                        onAnswered={(correct) => {
                          void settleAnswer(
                            correct && submittedOnTime.current,
                            !submittedOnTime.current,
                          );
                        }}
                      />
                    </>
                  ) : isLoading ? (
                    <Loading />
                  ) : (
                    <div className="space-y-2">
                      <p role="alert">クイズを取得できませんでした。</p>
                      <Button
                        variant="outline"
                        onClick={() => void retryContent()}
                      >
                        再試行
                      </Button>
                    </div>
                  )}
                </BattleDialog>
              )}
              {!feedback && run.phase === "path" && content ? (
                <>
                  <h3 className="text-sm font-medium">
                    第{run.readIds.length + 1}地点へ · 次の進路
                  </h3>
                  {connectionsLoading && <Loading />}
                  {connectionError && (
                    <div role="alert" className="text-sm space-y-2">
                      <p>{connectionError.message}</p>
                      <Button
                        variant="outline"
                        onClick={() => void retryConnections()}
                      >
                        繋がりを再取得
                      </Button>
                    </div>
                  )}
                  {paths.map((item) => (
                    <div
                      key={item.uid}
                      className="rounded-lg border p-3 space-y-3"
                    >
                      <PathTerms knowledge={item} />
                      <p className="text-base leading-relaxed">
                        {item.sentence}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          disabled={busy}
                          onClick={() =>
                            void advance(
                              item.uid,
                              map?.current === ENTRANCE ? "detour" : "relation",
                            )
                          }
                        >
                          見たよ · この道へ
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => openPreview({ sentenceId: item.uid })}
                        >
                          詳細
                        </Button>
                      </div>
                    </div>
                  ))}
                  {detour && (
                    <div className="rounded-lg border border-dashed p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        寄り道 · 知識の関係とは別の道
                      </p>
                      <PathTerms knowledge={detour} />
                      <p>{detour.sentence}</p>
                      <Button
                        disabled={busy}
                        variant="outline"
                        onClick={() => void advance(detour.uid)}
                      >
                        見たよ · 寄り道へ
                      </Button>
                    </div>
                  )}
                  {!paths.length &&
                    !detour &&
                    !connectionsLoading &&
                    !connectionError && (
                      <p className="text-sm text-muted-foreground">
                        新しい道はありません。マップから通った道を戻れます。
                      </p>
                    )}
                </>
              ) : !feedback && run.phase === "rest" ? (
                <div className="rounded-lg border p-4 space-y-3">
                  <h3 className="font-semibold">今回の冒険はここまで</h3>
                  <p className="text-sm text-muted-foreground">
                    HP・撃破数を引き継いで次の冒険へ。ダンジョン内では回復しません。
                  </p>
                  <Button
                    disabled={!canStart}
                    onClick={() => void startEvent()}
                  >
                    {!access.data?.available && remainingMinutes
                      ? `あと${remainingMinutes}分`
                      : "冒険を再開"}
                  </Button>
                </div>
              ) : !feedback && run.phase === "cleared" ? (
                <div
                  aria-live="polite"
                  className="rounded-lg border border-emerald-500/50 bg-emerald-500/5 p-4"
                >
                  <h3 className="font-semibold">ダンジョン攻略！</h3>
                  <p className="mt-2 text-sm">
                    攻略 {save.clears[run.resourceId]}周 ·
                    復習の成果を持ち帰ろう。
                  </p>
                </div>
              ) : !feedback && run.phase === "defeated" ? (
                <div aria-live="polite" className="rounded-lg border p-4">
                  <h3 className="font-semibold">冒険失敗</h3>
                  <p className="mt-2 text-sm">
                    攻略は振り出しへ。復習履歴とXPは失われません。
                  </p>
                </div>
              ) : null}
              <Button
                variant="outline"
                disabled={busy || run.phase === "battle" || Boolean(feedback)}
                onClick={() => void leave()}
              >
                {run.phase === "cleared" || run.phase === "defeated"
                  ? "入口へ戻る"
                  : "ダンジョンを切り替える"}
              </Button>
            </>
          )}
        </div>
      </div>
      {preview}
    </section>
  );
}
