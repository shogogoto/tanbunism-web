import { BookOpen, Coins, PackageOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import useSWR, { useSWRConfig } from "swr";
import AuthGuard from "~/features/auth/AuthGuard";
import { useAuth } from "~/features/auth/AuthProvider";
import { useResourceGrowth } from "~/features/gamification/ResourceGrowth";
import { invalidateGamification } from "~/features/gamification/invalidate";
import PreparationNotice, {
  preparationLabels,
} from "~/features/quiz/PreparationNotice";
import QuizPreviewPrompt from "~/features/quiz/QuizPreviewPrompt";
import { invalidateStudyPlanPreparationCache } from "~/features/quiz/api";
import { markTanbunSeen } from "~/features/review/api";
import {
  ContainedTanbunPreviews,
  useTanbunPreview,
} from "~/features/tanbun/detail/Preview";
import { canonicalSentenceId } from "~/features/tanbun/detail/cache";
import UserAvatar from "~/features/user/UserAvatar";
import Loading from "~/shared/components/Loading";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/shared/components/ui/tabs";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import { useGetLearningProgressUserUserIdLearningProgressGet } from "~/shared/generated/gamification/gamification";
import { tanbunDetailCache } from "~/shared/lib/indexed";
import AchievementsPanel from "./AchievementsPanel";
import BattleDialog from "./BattleDialog";
import BossPanel from "./BossPanel";
import EconomyPanel from "./EconomyPanel";
import GambitEditor from "./GambitEditor";
import ExplorationMap from "./Map";
import MultiBattle from "./MultiBattle";
import { useGameMusic } from "./MusicControls";
import PlayerStatus from "./PlayerStatus";
import ReviewRewards from "./ReviewRewards";
import SpecialtiesPanel from "./SpecialtiesPanel";
import StatEditor from "./StatEditor";
import { useAdventureAccess } from "./access";
import {
  freezeRegionEnemies,
  loadConnectedKnowledge,
  loadDungeon,
  loadDungeonPreparation,
  loadDungeonRegionQuizPool,
  mergeDungeonContent,
  regionEnemies,
  regionQuizPool,
  validateKnowledge,
} from "./api";
import {
  type CombatContext,
  type GameBalance,
  defaultBalance,
  gameRequest,
  playerStats,
} from "./battle";
import {
  ENEMIES_TO_CLEAR,
  type GameSave,
  MOVES_PER_EVENT,
  continueExploring,
  enterDungeon,
  move,
  newSave,
  recoverAtEntrance,
  resumeEvent,
} from "./domain";
import {
  ENTRANCE,
  PLACES_PER_REGION,
  RECOVERY,
  dungeonMap,
  explorationSource,
  explore,
  knownKnowledge,
  parkDungeon,
} from "./exploration";
import { exploredPlaceCount } from "./progress";
import { recoverGameState, requestGameState } from "./state";
import { readGameSave } from "./storage";
import { chestRegion, openChest, regionChests } from "./treasure";

export default function Game() {
  const { user } = useAuth();
  return (
    <AuthGuard>
      {user && (
        <ContainedTanbunPreviews value={true}>
          <GamePlay
            key={user.uid}
            userId={user.uid}
            player={user}
            playerName={user.display_name || user.username || undefined}
          />
        </ContainedTanbunPreviews>
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
  const [allocationPoints, setAllocationPoints] = useState(0);
  const [ready, setReady] = useState(false);
  const [stateLoaded, setStateLoaded] = useState(false);
  const revision = useRef(0);
  useEffect(() => {
    setAllocationPoints(
      Object.values(save.allocation ?? {}).reduce(
        (sum, points) => sum + points,
        0,
      ),
    );
  }, [save.allocation]);
  const { menu: routeMenu } = useParams();
  const panel =
    routeMenu === "status" ||
    routeMenu === "item" ||
    routeMenu === "shop" ||
    routeMenu === "achievements" ||
    routeMenu === "gambits" ||
    routeMenu === "specialties" ||
    routeMenu === "boss"
      ? routeMenu
      : undefined;
  const menuPanel =
    panel === "status" ||
    panel === "item" ||
    panel === "shop" ||
    panel === "gambits" ||
    panel === "specialties" ||
    panel === "achievements";
  const menuTab =
    panel === "specialties"
      ? "specialties"
      : panel === "gambits"
        ? "gambits"
        : panel === "item" || panel === "shop"
          ? "item"
          : panel === "achievements"
            ? "achievements"
            : "status";
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    function menuHotkey(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.altKey ||
        event.metaKey ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            'input,textarea,select,[contenteditable="true"],[role="textbox"]',
          ))
      )
        return;
      const dialogs = document.querySelectorAll(
        '[role="dialog"], [role="alertdialog"]',
      );
      const topDialog = dialogs[dialogs.length - 1];
      if (menuPanel && topDialog?.hasAttribute("data-game-menu")) {
        if (event.ctrlKey && /^[1-5]$/.test(event.key)) {
          event.preventDefault();
          const tab = [
            "status",
            "item",
            "gambits",
            "specialties",
            "achievements",
          ][Number(event.key) - 1];
          void navigate(`/game/${tab}`, {
            replace: true,
            state: location.state,
          });
        }
        return;
      }
    }
    window.addEventListener("keydown", menuHotkey, true);
    return () => window.removeEventListener("keydown", menuHotkey, true);
  }, [menuPanel, navigate, location.state]);
  function openPanel(panel: "status" | "item" | "shop" | "boss") {
    void navigate(`/game/${panel}`, { state: { gamePanelFromMap: true } });
  }
  function closePanel() {
    if (location.state?.gamePanelFromMap) void navigate(-1);
    else void navigate("/game", { replace: true });
  }
  const [showDestinations, setShowDestinations] = useState(false);
  const [legacy, setLegacy] = useState<GameSave>();
  const [now, setNow] = useState(Date.now);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingMove = useRef(false);
  const recoveryAttempt = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const answerRequestPending = useRef(false);
  const localBattle = useRef<string | null>(null);
  const { data: balance } = useSWR(
    ["game-balance", userId],
    () => gameRequest<GameBalance>("balance"),
    { revalidateOnFocus: true },
  );
  const { data: combat, mutate: retryCombat } = useSWR(
    stateLoaded && save.run && save.content
      ? ["game-combat", userId, save.run.resourceId]
      : null,
    () => gameRequest<CombatContext>("battle/context"),
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );
  const applyState = useCallback((state: import("./state").GameState) => {
    revision.current = state.revision;
    setSave(state.save);
    setFeedback(state.save.battleFeedback ?? undefined);
  }, []);
  const access = useAdventureAccess(userId);
  const { data: growth, error: growthError } = useResourceGrowth();
  useEffect(() => {
    if (!stateLoaded || save.run || selectedId) return;
    const recommended = [...(growth?.resources ?? [])].sort((a, b) =>
      (a.last_reviewed_on ?? "").localeCompare(b.last_reviewed_on ?? ""),
    )[0];
    if (recommended) setSelectedId(recommended.resource_id);
  }, [stateLoaded, save.run, selectedId, growth]);
  const progress = useGetLearningProgressUserUserIdLearningProgressGet(userId, {
    fetch: { credentials: "include" },
  });
  const level =
    progress.data?.status === 200 ? progress.data.data.level : undefined;
  const { mutate } = useSWRConfig();
  const { openPreview, preview } = useTanbunPreview();
  const run = save.run;
  useGameMusic(run ? "explore" : null);
  const resourceId = run?.resourceId ?? selectedId;
  const parked = save.dungeons?.[resourceId];
  const {
    data: dungeonPreparation,
    error: preparationError,
    mutate: refreshPreparation,
  } = useSWR(
    stateLoaded && resourceId
      ? ["game-dungeon-preparation", userId, resourceId]
      : null,
    () => loadDungeonPreparation(resourceId),
    { refreshInterval: 5_000, revalidateOnFocus: true },
  );
  async function retryDungeonPreparation() {
    setBusy(true);
    try {
      await gameRequest(
        `dungeons/${encodeURIComponent(resourceId)}/preparation/retry`,
        {},
        "POST",
      );
      await refreshPreparation();
      setError(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "再試行できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }
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
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      refreshInterval: (data) => (data && data.quizzes.length === 0 ? 5000 : 0),
    },
  );
  const content = run
    ? (save.content ?? loadedContent)
    : (parked?.content ?? loadedContent);
  const refreshResource = run?.resourceId;
  const refreshRegions = dungeonPreparation?.prepared_regions;
  const {
    data: refreshedContent,
    error: refreshError,
    mutate: retryRefresh,
  } = useSWR(
    stateLoaded &&
      refreshResource &&
      save.content &&
      refreshRegions !== undefined
      ? ["game-dungeon-refresh", userId, refreshResource, refreshRegions]
      : null,
    () => loadDungeon(refreshResource ?? "", refreshRegions),
    {
      revalidateOnFocus: false,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      refreshInterval: save.content?.quizzes.length === 0 ? 5000 : 0,
    },
  );
  const appliedRefresh = useRef<{
    source?: typeof refreshedContent;
    merged?: typeof refreshedContent;
  }>({});
  useEffect(() => {
    if (
      !refreshedContent ||
      !save.content ||
      (appliedRefresh.current.source === refreshedContent &&
        appliedRefresh.current.merged === save.content)
    )
      return;
    const original = save.content;
    const merged = mergeDungeonContent(original, refreshedContent);
    appliedRefresh.current = { source: refreshedContent, merged };
    if ((refreshRegions ?? 0) > 0) {
      void invalidateStudyPlanPreparationCache();
    }
    setSave((current) =>
      current.content === original &&
      current.run?.resourceId === refreshResource
        ? {
            ...current,
            content: merged,
          }
        : current,
    );
  }, [refreshedContent, refreshResource, refreshRegions, save.content]);
  const savedMap = run ? dungeonMap(save, run) : undefined;
  const map =
    savedMap && run?.phase === "defeated"
      ? { ...savedMap, current: ENTRANCE }
      : savedMap;
  const validationIds = [
    ...new Set([
      ...(content?.knowledge.map((item) => item.uid) ?? []),
      ...(map?.places.map((place) => place.id) ?? []),
    ]),
  ].sort();
  const {
    data: validIds,
    error: validationError,
    isLoading: validatingKnowledge,
    mutate: retryValidity,
  } = useSWR(
    stateLoaded && run?.phase === "path" && content
      ? ["game-valid-knowledge", userId, resourceId, validationIds.join(",")]
      : null,
    () => validateKnowledge(resourceId, validationIds),
    { revalidateOnFocus: true, shouldRetryOnError: false },
  );
  const validSet = validIds
    ? new Set(validIds.map(canonicalSentenceId))
    : undefined;
  const unavailableIds = validSet
    ? validationIds.filter((id) => !validSet.has(canonicalSentenceId(id)))
    : [];
  const unavailable = new Set(unavailableIds.map(canonicalSentenceId));
  const frontier = map ? explorationSource(map) : ENTRANCE;
  const {
    data: connected,
    error: connectionError,
    isLoading: connectionsLoading,
    mutate: retryConnections,
  } = useSWR(
    run && frontier !== ENTRANCE && run.phase === "path"
      ? ["game-connections", run.resourceId, frontier]
      : null,
    () => loadConnectedKnowledge(run?.resourceId ?? "", frontier),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  useEffect(() => {
    let active = true;
    const reload = () => {
      if (
        pendingMove.current ||
        answerRequestPending.current ||
        localBattle.current
      )
        return;
      void requestGameState()
        .then(async (state) => {
          if (state.save.battle?.schedule) {
            localBattle.current = state.save.battle.id;
            return state;
          }
          if (state.save.battle || state.save.run?.phase === "battle")
            return gameRequest<import("./state").GameState>(
              "battle/abandon",
              {},
              "POST",
            );
          const continued = continueExploring(state.save);
          if (continued !== state.save)
            return requestGameState({
              revision: state.revision,
              save: continued,
            });
          return state;
        })
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
        const continued = continueExploring(next);
        const state = await requestGameState({
          revision: revision.current,
          save: continued.run
            ? { ...continued, content: continued.content ?? content }
            : continued,
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
  useEffect(() => {
    if (!access.data?.available) {
      recoveryAttempt.current = undefined;
      return;
    }
    if (
      !stateLoaded ||
      !run ||
      run.phase === "defeated" ||
      !run.hp ||
      busy ||
      pendingMove.current ||
      answerRequestPending.current
    )
      return;
    const key = `${run.resourceId}:${access.data.next_available_at}:${access.data.receivedAt}`;
    if (recoveryAttempt.current === key) return;
    recoveryAttempt.current = key;
    pendingMove.current = true;
    setBusy(true);
    const previousRevision = revision.current;
    void recoverGameState()
      .then((state) => {
        revision.current = state.revision;
        setSave(state.save);
        setFeedback(state.save.battleFeedback ?? undefined);
        if (state.revision !== previousRevision)
          void access.mutate().catch(() => undefined);
      })
      .catch((cause) => {
        setError(cause.message);
      })
      .finally(() => {
        pendingMove.current = false;
        setBusy(false);
      });
  }, [
    access.data?.available,
    access.data?.next_available_at,
    access.data?.receivedAt,
    access.mutate,
    stateLoaded,
    run,
    busy,
  ]);
  async function advance(
    sentenceId: string,
    kind: "relation" | "detour" = "detour",
  ) {
    if (
      pendingMove.current ||
      !run ||
      !["path", "cleared"].includes(run.phase) ||
      !content
    )
      return;
    const currentMap = dungeonMap(save, run);
    const isNewPlace =
      sentenceId !== ENTRANCE &&
      !currentMap.places.some((place) => place.id === sentenceId);
    const destinationRegion = Math.floor(
      currentMap.places.length / PLACES_PER_REGION,
    );
    if (
      isNewPlace &&
      destinationRegion < 20 &&
      destinationRegion > (dungeonPreparation?.prepared_regions ?? 0)
    ) {
      setError(
        dungeonPreparation?.preparation &&
          ["failed", "exhausted"].includes(
            dungeonPreparation.preparation.status,
          )
          ? preparationLabels[dungeonPreparation.preparation.status]
          : "この領域のクイズはまだ準備できていません。準備状況を確認してください。",
      );
      return;
    }
    pendingMove.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const traveling =
        run.phase === "cleared" ? continueExploring(save) : save;
      const explored = explore(traveling, sentenceId, kind);
      if (explored === save) return;
      const region =
        dungeonMap(explored, explored.run ?? run).places.find(
          (place) => place.id === sentenceId,
        )?.region ?? 0;
      let dungeonContent = knownKnowledge(content, connected ?? []);
      const legacyPool =
        dungeonContent.regionQuizPools?.[region] ??
        (dungeonContent.regionEnemies?.[region]
          ? regionQuizPool(dungeonContent, region)
          : undefined);
      const population = await loadDungeonRegionQuizPool(
        run.resourceId,
        region + 1,
        legacyPool,
      );
      if (!population.ready) {
        setError(
          `領域${region + 1}のクイズが不足しています（${population.available_quizzes}/${population.required_quizzes}問）。準備状況を確認してください。`,
        );
        return;
      }
      const missingQuizzes = () => {
        const availableQuizIds = new Set(
          dungeonContent.quizzes.map((quiz) =>
            quiz.quiz_id.replaceAll("-", "").toLowerCase(),
          ),
        );
        return population.quiz_ids.some(
          (quizId) =>
            !availableQuizIds.has(quizId.replaceAll("-", "").toLowerCase()),
        );
      };
      if (missingQuizzes()) {
        const hydrated = await loadDungeonRegionQuizPool(
          run.resourceId,
          region + 1,
          undefined,
          true,
        );
        dungeonContent = mergeDungeonContent(dungeonContent, {
          knowledge: [],
          quizzes: hydrated.quizzes ?? [],
        });
        if (missingQuizzes()) {
          setError(
            `領域${region + 1}のクイズを取得できませんでした。もう一度移動を試してください。`,
          );
          return;
        }
      }
      const frozen = freezeRegionEnemies(
        dungeonContent,
        run.resourceId,
        region,
        population.quiz_ids,
        population,
      );
      const pool = regionEnemies(frozen, run.resourceId, region);
      if (!pool.length) {
        setError(
          "領域の敵を読み込めませんでした。少し待ってから進んでください。",
        );
        return;
      }
      if (sentenceId !== ENTRANCE) await markTanbunSeen(sentenceId, true);
      const next = move(explored, sentenceId, Math.random());
      if (next.run?.phase === "battle" && pool.length) {
        const enemy = pool[Math.floor(Math.random() * pool.length)];
        next.run = {
          ...next.run,
          enemyId: enemy.id,
          enemyHp: 0,
          enemyMaxHp: 1,
          quizCursor: enemy.quizIndex,
        };
      }
      const state = await update({ ...next, content: frozen });
      if (state.save.run?.phase === "battle") {
        localBattle.current = "starting";
        const started = await gameRequest<import("./state").GameState>(
          "battle/start",
          {
            revision: state.revision,
            scheduled: true,
            region,
            checkpoint: map?.current ?? ENTRANCE,
            discovered_place: isNewPlace ? sentenceId : null,
          },
        );
        localBattle.current = started.save.battle?.id ?? null;
        applyState(started);
        await retryCombat();
      }
      void invalidateGamification(mutate, { preserveData: true }).catch(
        () => undefined,
      );
    } catch (cause) {
      if (cause instanceof Error && "status" in cause && cause.status === 404) {
        await tanbunDetailCache
          .delete(canonicalSentenceId(map?.current ?? ""))
          .catch(() => undefined);
        try {
          await Promise.all([retryValidity(), retryConnections()]);
          setError(
            "この単文は削除・更新されたか、閲覧できなくなりました。移動数は消費せず、候補を更新しました。",
          );
        } catch {
          setError(
            "この単文は現在利用できません。候補の再取得に失敗しました。再試行してください。",
          );
        }
        return;
      }
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
  async function visitChest(region: number) {
    if (pendingMove.current || busy || !run) return;
    pendingMove.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const state = await openChest(revision.current, region);
      revision.current = state.revision;
      setSave(state.save);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "宝箱を開けられませんでした。",
      );
      const state = await requestGameState().catch(() => undefined);
      if (state) {
        revision.current = state.revision;
        setSave(state.save);
      }
    } finally {
      pendingMove.current = false;
      setBusy(false);
    }
  }
  async function switchDungeon(resourceId: string) {
    if (pendingMove.current || answerRequestPending.current) return;
    if (run?.phase === "battle" || feedback) return;
    if (!run || resourceId === run.resourceId) return;
    const destination = growth?.resources.find(
      (item) =>
        canonicalSentenceId(item.resource_id) ===
        canonicalSentenceId(resourceId),
    );
    if (!destination) return;
    const allowed = [
      ...(save.visitedDungeons ?? []),
      ...Object.keys(save.dungeons ?? {}),
      ...(save.unlockedDungeons ?? []).map((item) => item.resourceId),
    ];
    if (
      !allowed.some(
        (id) => canonicalSentenceId(id) === canonicalSentenceId(resourceId),
      )
    )
      return;
    setBusy(true);
    pendingMove.current = true;
    setError(undefined);
    try {
      const preparation = await loadDungeonPreparation(destination.resource_id);
      const parkedSave = parkDungeon(save);
      const paused = parkedSave.dungeons?.[destination.resource_id];
      const otherDungeons = { ...parkedSave.dungeons };
      delete otherDungeons[destination.resource_id];
      let entering = paused
        ? {
            ...parkedSave,
            dungeons: otherDungeons,
            run: paused.run,
            content: paused.content,
          }
        : enterDungeon(
            parkedSave,
            destination.resource_id,
            destination.resource_name ?? "ダンジョン",
            level ?? 1,
          );
      const loaded =
        entering.content ??
        (await loadDungeon(
          destination.resource_id,
          preparation.prepared_regions,
        ));
      if (!loaded.knowledge.length)
        throw new Error("このダンジョンには探索できる知識がありません。");
      const stats = playerStats(
        save.allocation,
        balance ?? defaultBalance,
        save.economy?.weapon_attack,
      );
      if (entering.run)
        entering = {
          ...entering,
          content: loaded,
          run: {
            ...entering.run,
            ...stats,
            hp: Math.min(run.hp, stats.maxHp),
            moves: run.moves,
            kills: paused?.run.phase === "cleared" ? 0 : entering.run.kills,
            phase:
              run.hp === 0
                ? "defeated"
                : run.moves >= MOVES_PER_EVENT
                  ? "rest"
                  : "path",
          },
        };
      await update(entering);
      setSelectedId(destination.resource_id);
      void retryCombat();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "ダンジョンを移動できませんでした。",
      );
    } finally {
      pendingMove.current = false;
      setBusy(false);
    }
  }
  async function restartAtEntrance() {
    if (!run || busy || pendingMove.current || !access.data?.available) return;
    pendingMove.current = true;
    setBusy(true);
    try {
      const restarting = enterDungeon(
        { ...save, run: undefined, battle: null, battleFeedback: undefined },
        run.resourceId,
        run.name,
        level ?? 1,
      );
      const stats = playerStats(
        save.allocation,
        balance ?? defaultBalance,
        save.economy?.weapon_attack,
      );
      if (restarting.run)
        restarting.run = { ...restarting.run, ...stats, hp: stats.maxHp };
      await update({ ...restarting, content }, true);
      void access.mutate();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "冒険を再開できませんでした。",
      );
    } finally {
      pendingMove.current = false;
      setBusy(false);
    }
  }
  async function recoverAtSanctuary() {
    if (!run || busy || pendingMove.current) return;
    const recovered = recoverAtEntrance(save);
    if (recovered === save) return;
    pendingMove.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await update(recovered);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "回復場所へ移動できませんでした。",
      );
    } finally {
      pendingMove.current = false;
      setBusy(false);
    }
  }
  async function challengeBoss(level: number) {
    if (busy || pendingMove.current || !run) return;
    pendingMove.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const started = await gameRequest<import("./state").GameState>(
        "battle/boss",
        { revision: revision.current, level, scheduled: true },
      );
      localBattle.current = started.save.battle?.id ?? null;
      applyState(started);
      closePanel();
      await retryCombat();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "ボスへ挑戦できませんでした。",
      );
    } finally {
      pendingMove.current = false;
      setBusy(false);
    }
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
      if (!run && next.run && !parked) {
        const stats = playerStats(
          save.allocation,
          balance ?? defaultBalance,
          save.economy?.weapon_attack,
        );
        next.run = { ...next.run, ...stats, hp: stats.maxHp };
      }
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
    frontier === ENTRANCE
      ? (content?.knowledge
          .filter(
            (item) =>
              !discovered.has(item.uid) &&
              !unavailable.has(canonicalSentenceId(item.uid)),
          )
          .slice(0, 3) ?? [])
      : (connected ?? [])
          .filter(
            (item) =>
              !discovered.has(item.uid) &&
              !unavailable.has(canonicalSentenceId(item.uid)),
          )
          .slice(0, 3);
  const detour =
    frontier !== ENTRANCE && !connectionsLoading && !connectionError
      ? content?.knowledge.find(
          (item) =>
            !discovered.has(item.uid) &&
            !unavailable.has(canonicalSentenceId(item.uid)) &&
            !paths.some((path) => path.uid === item.uid),
        )
      : undefined;
  const activeEnemy = Object.values(content?.regionEnemies ?? {})
    .flat()
    .find((enemy) => enemy.id === run?.enemyId);
  const quiz = activeEnemy
    ? content?.quizzes[activeEnemy.quizIndex]
    : content?.quizzes.length
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
  const recoveryStatus = (
    <span title="冒険権は毎時00分・30分に回復します。">
      {access.error
        ? "冒険権を確認できません"
        : access.data?.available
          ? "冒険可能"
          : access.data
            ? `回復まで ${remainingMinutes}分`
            : "冒険権を確認中"}
    </span>
  );

  return (
    <section
      className={`mx-auto w-full space-y-4 p-2 pb-8 sm:p-3 ${run ? "" : "max-w-3xl"}`}
    >
      <div className="space-y-4">
        {!run && (
          <div className="flex items-center gap-2">
            <Button
              data-game-status-trigger
              variant="outline"
              onClick={() => openPanel("status")}
            >
              ステータス
            </Button>
            <Button variant="outline" onClick={() => openPanel("item")}>
              アイテム
            </Button>
            <div className="ml-auto text-xs">{recoveryStatus}</div>
          </div>
        )}
        {(error || access.error || growthError || progress.error) && (
          <p role="alert" className="text-sm text-destructive">
            {error ??
              access.error?.message ??
              growthError?.message ??
              "プレイヤーのLvを取得できませんでした。"}
          </p>
        )}
        {refreshError && (
          <div role="alert" className="text-sm text-destructive">
            クイズの更新に失敗しました。現在の進行は保持しています。
            <Button
              variant="outline"
              onClick={() => void retryRefresh().catch(() => undefined)}
            >
              クイズ更新を再試行
            </Button>
          </div>
        )}
        {localBattle.current === "starting" && error && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void gameRequest<import("./state").GameState>(
                "battle/abandon",
                {},
                "POST",
              )
                .then((state) => {
                  localBattle.current = null;
                  applyState(state);
                  setError(undefined);
                })
                .catch((cause) => setError(cause.message))
                .finally(() => setBusy(false));
            }}
          >
            遭遇に失敗した戦闘から撤退
          </Button>
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
        <section className="space-y-4" aria-label="冒険">
          {!run ? (
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
              {preparationError && (
                <p role="alert">クイズの準備状況を取得できませんでした。</p>
              )}
              {dungeonPreparation &&
                (dungeonPreparation.target_regions >
                  dungeonPreparation.prepared_regions ||
                  ["queued", "running", "failed", "exhausted"].includes(
                    dungeonPreparation.preparation?.status ?? "",
                  )) && (
                  <div className="space-y-1">
                    <PreparationNotice
                      preparation={dungeonPreparation.preparation}
                    />
                    {(!dungeonPreparation.preparation ||
                      dungeonPreparation.preparation.status === "idle") && (
                      <p className="text-sm text-muted-foreground">
                        クイズの準備待ちです。
                      </p>
                    )}
                    {["failed", "exhausted"].includes(
                      dungeonPreparation.preparation?.status ?? "",
                    ) && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void retryDungeonPreparation()}
                      >
                        クイズの準備を再試行
                      </Button>
                    )}
                  </div>
                )}
              {map && (
                <ExplorationMap
                  dungeonId={run.resourceId}
                  dungeons={resources
                    .filter(
                      (item) =>
                        item.resource_id !== run.resourceId &&
                        [
                          ...(save.visitedDungeons ?? []),
                          ...Object.keys(save.dungeons ?? {}),
                          ...(save.unlockedDungeons ?? []).map(
                            (value) => value.resourceId,
                          ),
                        ].some(
                          (id) =>
                            canonicalSentenceId(id) ===
                            canonicalSentenceId(item.resource_id),
                        ),
                    )
                    .map((item) => {
                      const exploredPlaces = exploredPlaceCount(
                        save,
                        item.resource_id,
                      );
                      return {
                        id: item.resource_id,
                        name: item.resource_name ?? "ダンジョン",
                        exploredPlaces,
                        achievement: Math.floor(exploredPlaces / 5),
                      };
                    })}
                  dungeonConnections={(save.unlockedDungeons ?? []).map(
                    (item) => ({ from: item.sourceId, to: item.resourceId }),
                  )}
                  onDungeon={(id) => void switchDungeon(id)}
                  onBoss={(level) => void challengeBoss(level)}
                  bossClears={
                    save.bossClears?.[canonicalSentenceId(run.resourceId)] ?? []
                  }
                  canChallengeBoss={() =>
                    !save.battleFeedback &&
                    run.hp > 0 &&
                    run.moves < MOVES_PER_EVENT &&
                    ["path", "cleared"].includes(run.phase)
                  }
                  onRestart={
                    run.phase === "defeated" && access.data?.available
                      ? () => void restartAtEntrance()
                      : undefined
                  }
                  openedChests={save.economy?.opened_chests?.[run.resourceId]}
                  canTravel={(id) =>
                    chestRegion(id) !== undefined
                      ? run.hp > 0 &&
                        ["path", "rest", "cleared"].includes(run.phase) &&
                        regionChests(map).some(
                          (chest) =>
                            chest.id === id &&
                            (map.current === chest.last ||
                              map.current === chest.id),
                        )
                      : id === RECOVERY
                        ? recoverAtEntrance(save) !== save
                        : run.phase === "path" ||
                          (run.phase === "cleared" &&
                            run.moves < MOVES_PER_EVENT) ||
                          (id === ENTRANCE &&
                            run.phase === "defeated" &&
                            Boolean(access.data?.available))
                  }
                  map={map}
                  knowledge={content?.knowledge ?? []}
                  onOpen={(sentenceId) => openPreview({ sentenceId })}
                  onMove={(sentenceId, kind) => {
                    const region = chestRegion(sentenceId);
                    if (region !== undefined) void visitChest(region);
                    else if (sentenceId === RECOVERY) void recoverAtSanctuary();
                    else if (
                      sentenceId === ENTRANCE &&
                      run.phase === "defeated"
                    )
                      void restartAtEntrance();
                    else void advance(sentenceId, kind);
                  }}
                  disabled={
                    busy ||
                    Boolean(feedback) ||
                    run.phase === "battle" ||
                    validatingKnowledge ||
                    Boolean(validationError)
                  }
                  unavailableIds={unavailableIds}
                  enemiesByRegion={
                    content
                      ? Object.fromEntries(
                          [
                            ...new Set(
                              map?.places.map((place) => place.region) ?? [],
                            ),
                          ].map((region) => [
                            region,
                            combat
                              ? combat.enemies.filter(
                                  (enemy) => enemy.region === region,
                                )
                              : regionEnemies(content, run.resourceId, region),
                          ]),
                        )
                      : {}
                  }
                  quizzes={content?.quizzes ?? []}
                  player={player}
                  title={run.name}
                  remainingMoves={Math.max(0, MOVES_PER_EVENT - run.moves)}
                  recoveryStatus={recoveryStatus}
                  exhaustedMessage={
                    !feedback &&
                    run.moves >= MOVES_PER_EVENT &&
                    (run.phase === "rest" || run.phase === "defeated") ? (
                      <div className="space-y-3">
                        <h3 className="font-semibold">歩数を使い切りました</h3>
                        <ReviewRewards userId={userId} />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => openPanel("item")}
                          >
                            歩数回復薬を使う
                            {save.economy?.inventory.step_potion
                              ? ` (${save.economy.inventory.step_potion})`
                              : ""}
                          </Button>
                          {run.phase === "rest" && (
                            <Button
                              disabled={!canStart}
                              onClick={() => void startEvent()}
                            >
                              {!access.data?.available && remainingMinutes
                                ? `あと${remainingMinutes}分`
                                : "冒険を再開"}
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : undefined
                  }
                  status={
                    <p className="text-xs text-muted-foreground">
                      撃破 {run.kills}/{ENEMIES_TO_CLEAR}
                    </p>
                  }
                  playerStatus={
                    <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
                      <Button
                        variant="ghost"
                        onClick={() => openPanel("status")}
                        data-game-status-trigger
                        aria-label="プレイヤーのステータス・育成ポイントを開く"
                        title="ステータス・育成ポイント"
                        className="-mx-3 -my-2 flex min-h-11 min-w-0 items-center rounded-lg px-3 py-2 outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <PlayerStatus
                          compact
                          run={run}
                          name={playerName}
                          player={player}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPanel("item")}
                        aria-label="アイテムボックスを開く"
                        title="アイテムボックス"
                        className="size-7 shrink-0 sm:size-8"
                      >
                        <PackageOpen aria-hidden="true" className="size-4" />
                      </Button>
                      <button
                        type="button"
                        onClick={() => openPanel("shop")}
                        aria-label={`所持ゴールド ${save.economy?.gold ?? 0}`}
                        title="ショップを開く"
                        className="flex min-h-7 shrink-0 items-center gap-1 rounded-md px-1 text-xs tabular-nums text-amber-400 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8 sm:px-1.5"
                      >
                        <Coins aria-hidden="true" className="size-4" />
                        {save.economy?.gold ?? 0}
                      </button>
                    </div>
                  }
                  candidates={
                    !feedback && run.phase === "path"
                      ? [
                          ...paths.map((knowledge) => ({
                            knowledge,
                            kind:
                              frontier === ENTRANCE
                                ? ("detour" as const)
                                : ("relation" as const),
                          })),
                          ...(detour
                            ? [{ knowledge: detour, kind: "detour" as const }]
                            : []),
                        ]
                      : []
                  }
                >
                  {isLoading && <Loading />}
                  {validationError && (
                    <div
                      role="alert"
                      className="rounded-lg border bg-background p-3"
                    >
                      <p>単文の有効性を確認できませんでした。</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void retryValidity().catch(() => undefined)
                        }
                      >
                        候補を再取得
                      </Button>
                    </div>
                  )}
                  {(feedback || run.phase === "battle") &&
                    !localBattle.current && (
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
                              <QuizPreviewPrompt
                                quiz={quiz}
                                showCorrectAnswer
                              />
                            )}
                            <Button
                              disabled={busy}
                              onClick={() => {
                                setBusy(true);
                                void update({
                                  ...save,
                                  battleFeedback: undefined,
                                })
                                  .catch((cause) => setError(cause.message))
                                  .finally(() => setBusy(false));
                              }}
                            >
                              続ける
                            </Button>
                          </div>
                        ) : null}
                      </BattleDialog>
                    )}
                  {!feedback && run.phase === "path" && content ? (
                    <>
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
                      {!paths.length &&
                        !detour &&
                        !connectionsLoading &&
                        !connectionError && (
                          <p className="text-sm text-muted-foreground">
                            新しい道はありません。マップから通った道を戻れます。
                          </p>
                        )}
                    </>
                  ) : !feedback &&
                    run.phase === "defeated" &&
                    run.moves < MOVES_PER_EVENT ? (
                    <div aria-live="polite" className="rounded-lg border p-4">
                      <h3 className="font-semibold">冒険失敗</h3>
                      <p className="mt-2 text-sm">
                        {run.moves < MOVES_PER_EVENT
                          ? "入口へ戻りました。回復場所で1歩使ってHPを回復し、残り歩数で探索を続けられます。"
                          : "入口へ戻りました。歩数の回復を待つか、復習で歩数回復薬を獲得できます。"}
                      </p>
                    </div>
                  ) : null}
                </ExplorationMap>
              )}
            </>
          )}
        </section>
      </div>
      {localBattle.current &&
        content &&
        combat &&
        (feedback || run?.phase === "battle") && (
          <MultiBattle
            save={save}
            content={content}
            context={combat}
            player={player}
            playerName={playerName}
            clockOffset={
              access.data ? access.data.server_now - access.data.receivedAt : 0
            }
            onSaved={(state) => {
              applyState(state);
              if (!save.battle?.schedule) void retryCombat();
              void invalidateGamification(mutate, {
                preserveData: true,
              }).catch(() => undefined);
            }}
            onBusy={(value) => {
              answerRequestPending.current = value;
              setAnswerSubmitting(value);
            }}
            onFinished={async () => {
              setBusy(true);
              try {
                await update({ ...save, battleFeedback: undefined });
                localBattle.current = null;
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "保存できませんでした。",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      {preview}
      <Dialog
        open={Boolean(panel)}
        onOpenChange={(open) => {
          if (!open) closePanel();
        }}
      >
        <DialogContent
          className={`max-h-[90dvh] overflow-y-auto sm:max-w-lg ${menuPanel ? "top-[5dvh] translate-y-0" : ""}`}
          data-dashboard-swipe-ignore
          data-game-menu={menuPanel ? "" : undefined}
        >
          <DialogHeader>
            <DialogTitle>{menuPanel ? "ゲームメニュー" : "ボス"}</DialogTitle>
            {panel === "boss" && (
              <DialogDescription>
                達成度5ごとに挑戦できます。撃破すると専門分野が開放されます。
              </DialogDescription>
            )}
          </DialogHeader>
          {panel === "boss" && (
            <BossPanel
              save={save}
              busy={busy}
              error={error}
              onChallenge={(level) => void challengeBoss(level)}
            />
          )}
          {menuPanel && (
            <Tabs
              value={menuTab}
              onValueChange={(value) =>
                void navigate(`/game/${value}`, {
                  replace: true,
                  state: location.state,
                })
              }
            >
              <TabsList
                aria-label="ゲームメニュー"
                className="h-auto w-full flex-wrap"
              >
                {(
                  [
                    ["status", "ステータス"],
                    ["item", "アイテム"],
                    ["gambits", "ガンビット"],
                    ["specialties", "専門分野"],
                    ["achievements", "実績"],
                  ] as const
                ).map(([value, label], index) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    aria-label={label}
                    title={`Ctrl + ${index + 1}`}
                  >
                    <kbd className="mr-1 font-mono text-[10px] text-muted-foreground">
                      {index + 1}
                    </kbd>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="status" className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserAvatar user={player} className="size-9 shrink-0" />
                  <span>
                    {playerName ?? "あなた"} · Lv. {level ?? "—"}{" "}
                    <span
                      aria-label="割り振りポイント"
                      className="text-sm text-muted-foreground"
                    >
                      ({allocationPoints}/{Math.max(0, (level ?? 1) - 1) * 3}{" "}
                      pt)
                    </span>
                  </span>
                </div>
                {level && stateLoaded && (
                  <StatEditor
                    level={level}
                    allocation={save.allocation}
                    balance={balance ?? defaultBalance}
                    inBattle={run?.phase === "battle"}
                    currentHp={run?.hp}
                    weaponAttack={save.economy?.weapon_attack}
                    onPointsChange={setAllocationPoints}
                    onSaved={applyState}
                  />
                )}
              </TabsContent>
              <TabsContent value="item">
                {stateLoaded && (
                  <EconomyPanel
                    userId={userId}
                    save={save}
                    revision={revision.current}
                    shop={panel === "shop"}
                    disabled={
                      busy || Boolean(feedback) || run?.phase === "battle"
                    }
                    onSaved={(state) => {
                      applyState(state);
                      void retryCombat();
                    }}
                    onTab={(next) => {
                      void navigate(`/game/${next}`, {
                        replace: true,
                        state: location.state,
                      });
                    }}
                  />
                )}
              </TabsContent>
              <TabsContent value="gambits">
                {stateLoaded && (
                  <GambitEditor
                    level={level ?? 1}
                    key={save.run?.resourceId ?? "player"}
                    save={save}
                    revision={revision.current}
                    onSaved={applyState}
                    disabled={
                      busy || Boolean(feedback) || run?.phase === "battle"
                    }
                  />
                )}
              </TabsContent>
              <TabsContent value="achievements">
                <AchievementsPanel
                  save={save}
                  resources={growth?.resources ?? []}
                />
              </TabsContent>
              <TabsContent value="specialties">
                <SpecialtiesPanel
                  save={save}
                  revision={revision.current}
                  onSaved={applyState}
                  disabled={
                    busy || Boolean(feedback) || run?.phase === "battle"
                  }
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
