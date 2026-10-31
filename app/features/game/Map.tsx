import {
  Archive,
  Crown,
  Footprints,
  LocateFixed,
  Maximize,
  Minus,
  PackageOpen,
  Plus,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import UserAvatar from "~/features/user/UserAvatar";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import MusicControls from "./MusicControls";
import PathTerms from "./PathTerms";
import RegionEnemies from "./RegionEnemies";
import type { DungeonContent, PathKnowledge, RegionEnemy } from "./api";
import { mapBosses } from "./boss";
import {
  type DungeonMap,
  ENTRANCE,
  PLACES_PER_REGION,
  RECOVERY,
  explorationSource,
} from "./exploration";
import { directionalPlace } from "./navigation";
import { type ChestReward, chestMessage, regionChests } from "./treasure";

export type MapCandidate = {
  knowledge: PathKnowledge;
  kind: "relation" | "detour";
};

export default function ExplorationMap({
  map,
  knowledge,
  candidates = [],
  dungeonId,
  dungeons = [],
  dungeonConnections = [],
  onDungeon,
  onRestart,
  openedChests = {},
  canTravel = () => true,
  unavailableIds = [],
  enemiesByRegion = {},
  quizzes = [],
  onOpen,
  onMove,
  disabled,
  player,
  title,
  status,
  remainingMoves,
  recoveryStatus,
  playerStatus,
  onBoss,
  canChallengeBoss = () => false,
  bossClears = [],
  exhaustedMessage,
  children,
}: {
  map: DungeonMap;
  knowledge: PathKnowledge[];
  candidates?: MapCandidate[];
  dungeonId?: string;
  dungeons?: {
    id: string;
    name: string;
    exploredPlaces?: number;
    achievement?: number;
  }[];
  dungeonConnections?: { from: string; to: string }[];
  onDungeon?: (id: string) => void;
  onRestart?: () => void;
  openedChests?: Record<string, ChestReward>;
  canTravel?: (id: string) => boolean;
  unavailableIds?: string[];
  enemiesByRegion?: Record<string, RegionEnemy[]>;
  quizzes?: DungeonContent["quizzes"];
  onOpen: (id: string) => void;
  onMove: (id: string, kind?: "relation" | "detour") => void;
  disabled: boolean;
  player?: UserReadPublic;
  title?: string;
  status?: ReactNode;
  remainingMoves?: number;
  recoveryStatus?: ReactNode;
  playerStatus?: ReactNode;
  onBoss?: (level: number) => void;
  canChallengeBoss?: (level: number) => boolean;
  bossClears?: number[];
  exhaustedMessage?: ReactNode;
  children?: ReactNode;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(map.current);
  const [focused, setFocused] = useState(map.current);
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const primaryAction = useRef<HTMLButtonElement>(null);
  const keyboardNavigation = useRef(false);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const mapElement = useRef<HTMLElement>(null);
  const fullButton = useRef<HTMLButtonElement>(null);
  const ownsFullscreen = useRef(false);
  function closeFullscreen() {
    setFullscreen(false);
    if (ownsFullscreen.current && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
    ownsFullscreen.current = false;
  }
  function toggleFullscreen() {
    if (fullscreen) return closeFullscreen();
    setFullscreen(true);
    // Keep body-level battle and detail portals inside native fullscreen.
    const request = document.documentElement.requestFullscreen;
    if (request && !document.fullscreenElement) {
      ownsFullscreen.current = true;
      void request
        .call(document.documentElement, { navigationUI: "hide" })
        .then(
          () => {
            if (!ownsFullscreen.current && document.fullscreenElement) {
              void document.exitFullscreen().catch(() => undefined);
            }
          },
          () => {
            ownsFullscreen.current = false;
          },
        );
    }
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: toggle reads fullscreen and stable DOM refs only.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as Element | null;
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.key.toLowerCase() !== "f" ||
        target?.closest(
          "input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox]",
        ) ||
        (target?.closest("dialog, [role=dialog], [role=alertdialog]") &&
          !mapElement.current?.contains(target))
      )
        return;
      event.preventDefault();
      toggleFullscreen();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);
  useEffect(() => {
    function changed() {
      if (!document.fullscreenElement && ownsFullscreen.current) {
        ownsFullscreen.current = false;
        setFullscreen(false);
      }
    }
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
      if (ownsFullscreen.current && document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
      ownsFullscreen.current = false;
    };
  }, []);
  const drag = useRef<
    { x: number; y: number; left: number; top: number } | undefined
  >(undefined);
  const sentences = new Map(
    [...knowledge, ...candidates.map((item) => item.knowledge)].map((item) => [
      item.uid,
      item,
    ]),
  );
  const allIds = [ENTRANCE, ...map.places.map((place) => place.id)];
  const showEntranceFacilities = map.current === ENTRANCE;
  const fresh = candidates.filter(
    (item) => !allIds.includes(item.knowledge.uid),
  );
  const positions = new Map<string, { x: number; y: number }>();
  const chests = regionChests(map);
  const bosses = onBoss ? mapBosses(map) : [];
  const entranceX =
    360 + (showEntranceFacilities ? Math.ceil(dungeons.length / 4) * 230 : 0);
  positions.set(ENTRANCE, { x: entranceX, y: 220 });
  const regionLengths = new Map<number, number>();
  for (const place of map.places) {
    const column = (regionLengths.get(place.region) ?? 0) + 1;
    regionLengths.set(place.region, column);
    positions.set(place.id, {
      x: entranceX + column * 230,
      y: 220 + place.region * 150,
    });
  }
  if (showEntranceFacilities) positions.set(RECOVERY, { x: entranceX, y: 370 });
  for (const chest of chests) {
    positions.set(chest.id, {
      x:
        entranceX +
        (chest.count +
          1 +
          Number(bosses.some((boss) => boss.region === chest.region))) *
          230,
      y: 220 + chest.region * 150,
    });
  }
  for (const boss of bosses) {
    const anchor = positions.get(boss.last);
    if (anchor) positions.set(boss.id, { x: anchor.x + 230, y: anchor.y });
  }
  const frontier = explorationSource(map);
  const candidateRegion = Math.floor(map.places.length / PLACES_PER_REGION);
  for (const [index, item] of fresh.entries()) {
    positions.set(item.knowledge.uid, {
      x: entranceX + ((regionLengths.get(candidateRegion) ?? 0) + 1) * 230,
      y: 220 + candidateRegion * 150 + index * 110,
    });
  }
  const worldId = (id: string) =>
    `@dungeon:${id.replaceAll("-", "").toLowerCase()}`;
  for (const [index, dungeon] of (showEntranceFacilities
    ? dungeons
    : []
  ).entries()) {
    positions.set(worldId(dungeon.id), {
      x: entranceX - 230 * (Math.floor(index / 4) + 1),
      y: 220 + (index % 4) * 150,
    });
  }
  const worldPosition = (id: string) =>
    id.replaceAll("-", "").toLowerCase() ===
    dungeonId?.replaceAll("-", "").toLowerCase()
      ? positions.get(ENTRANCE)
      : positions.get(worldId(id));
  const width = Math.max(
    1200,
    ...[...positions.values()].map((p) => p.x + 460),
  );
  const height = Math.max(
    800,
    ...[...positions.values()].map((p) => p.y + 320),
  );
  const currentPosition = positions.get(map.current);
  function center() {
    viewport.current?.scrollTo?.({
      left: Math.max(
        0,
        (currentPosition?.x ?? 0) * zoom -
          viewport.current.clientWidth / 2 +
          80 * zoom,
      ),
      top: Math.max(
        0,
        (currentPosition?.y ?? 0) * zoom -
          viewport.current.clientHeight / 2 +
          40 * zoom,
      ),
    });
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-center when the canvas moves into/out of the fullscreen portal.
  useEffect(() => {
    center();
  }, [currentPosition?.x, currentPosition?.y, zoom, fullscreen, dungeonId]);
  // The fullscreen portal mounts after the first effect; resize also happens on rotation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: center uses current canvas dimensions.
  useEffect(() => {
    const element = viewport.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(center);
    observer.observe(element);
    return () => observer.disconnect();
  }, [currentPosition?.x, currentPosition?.y, zoom, fullscreen]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: switching dungeons must clear selection even if both current locations are the entrance.
  useEffect(() => {
    if (map.current) {
      setSelected(map.current);
      setFocused(map.current);
      if (keyboardNavigation.current) {
        nodes.current.get(map.current)?.focus({ preventScroll: true });
      }
    }
  }, [map.current, dungeonId]);
  function focusPlace(id: string) {
    setFocused(id);
    setSelected(id);
    const node = nodes.current.get(id);
    node?.focus({ preventScroll: true });
    const point = positions.get(id);
    const element = viewport.current;
    if (point && element) {
      element.scrollTo?.({
        left: Math.max(0, (point.x + 80) * zoom - element.clientWidth / 2),
        top: Math.max(0, (point.y + 40) * zoom - element.clientHeight / 2),
      });
    }
  }
  function closeSelection() {
    const previous = selected;
    if (previous) focusPlace(previous);
    setSelected(undefined);
  }
  const chosen = selected ? sentences.get(selected) : undefined;
  const candidate = candidates.find((item) => item.knowledge.uid === selected);
  const selectedChest = chests.find((chest) => chest.id === selected);
  const selectedBoss = bosses.find((boss) => boss.id === selected);
  const canFightBoss = (boss: (typeof bosses)[number]) =>
    !disabled &&
    canChallengeBoss(boss.level) &&
    (map.current === boss.last ||
      chests.some(
        (chest) => chest.region === boss.region && chest.id === map.current,
      ));
  const chestReward = selectedChest && openedChests[selectedChest.region];
  const canMove =
    !disabled &&
    canTravel(selected ?? "") &&
    !unavailableIds.includes(selected ?? "") &&
    (selected !== map.current ||
      (selected === ENTRANCE && Boolean(onRestart))) &&
    Boolean(
      selected &&
        (selected === RECOVERY ||
          selectedChest ||
          allIds.includes(selected) ||
          candidate),
    );
  const index = map.places.findIndex((place) => place.id === map.current);
  const currentChest = chests.find((chest) => chest.id === map.current);
  const selectedDungeon = dungeons.find(
    (item) => worldId(item.id) === selected,
  );
  const canvas = (
    <section
      ref={mapElement}
      aria-label="ダンジョンのマップ"
      className={`relative isolate min-w-0 overflow-hidden bg-background ${fullscreen ? "h-dvh w-full" : "h-[calc(100dvh-8rem)] min-h-0 rounded-xl border sm:h-[calc(100dvh-5rem)]"}`}
    >
      <div
        ref={viewport}
        aria-label="探索マップをスクロール"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: map entry point supports spatial keyboard navigation.
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.defaultPrevented) return;
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
            return;
          if (event.key.startsWith("Arrow")) {
            event.preventDefault();
            event.stopPropagation();
            keyboardNavigation.current = true;
            const origin = nodes.current.has(focused) ? focused : map.current;
            focusPlace(
              directionalPlace(positions, origin, event.key) ?? origin,
            );
          } else if (event.key === "Escape" && selected) {
            event.preventDefault();
            event.stopPropagation();
            closeSelection();
          } else if (
            event.target === event.currentTarget &&
            event.key === "Enter"
          ) {
            event.preventDefault();
            focusPlace(map.current);
          }
        }}
        className="absolute inset-0 overflow-auto overscroll-contain cursor-grab active:cursor-grabbing"
        onPointerDown={(event) => {
          if (
            event.pointerType !== "mouse" ||
            (event.target as Element).closest("button")
          )
            return;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            top: event.currentTarget.scrollTop,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current) {
            event.currentTarget.scrollLeft =
              drag.current.left + drag.current.x - event.clientX;
            event.currentTarget.scrollTop =
              drag.current.top + drag.current.y - event.clientY;
          }
        }}
        onPointerUp={() => {
          drag.current = undefined;
        }}
        onPointerCancel={() => {
          drag.current = undefined;
        }}
      >
        <div style={{ width: width * zoom, height: height * zoom }}>
          <div
            className="relative bg-[radial-gradient(circle,var(--color-border)_1px,transparent_1px)] bg-[size:28px_28px]"
            style={{
              width,
              height,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 text-primary/50"
              width={width}
              height={height}
            >
              {(showEntranceFacilities ? dungeons : []).map((dungeon) => {
                const from = positions.get(ENTRANCE);
                const to = positions.get(worldId(dungeon.id));
                return from && to ? (
                  <line
                    key={`world-${dungeon.id}`}
                    x1={from.x + 80}
                    y1={from.y + 38}
                    x2={to.x + 80}
                    y2={to.y + 38}
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.35"
                  />
                ) : null;
              })}
              {(showEntranceFacilities ? dungeonConnections : []).map(
                (edge) => {
                  const from = worldPosition(edge.from);
                  const to = worldPosition(edge.to);
                  return from && to ? (
                    <line
                      key={`unlock-${edge.from}-${edge.to}`}
                      x1={from.x + 80}
                      y1={from.y + 38}
                      x2={to.x + 80}
                      y2={to.y + 38}
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                  ) : null;
                },
              )}
              {[
                ...(showEntranceFacilities
                  ? [
                      {
                        from: ENTRANCE,
                        to: RECOVERY,
                        kind: "relation" as const,
                      },
                    ]
                  : []),
                ...map.edges,
                ...bosses.map((boss) => ({
                  from: boss.last,
                  to: boss.id,
                  kind: "relation" as const,
                })),
                ...chests.map((chest) => ({
                  from:
                    bosses.find((boss) => boss.region === chest.region)?.id ??
                    chest.last,
                  to: chest.id,
                  kind: "relation" as const,
                })),
                ...fresh.map((item) => ({
                  from: frontier,
                  to: item.knowledge.uid,
                  kind: item.kind,
                })),
              ].map((edge) => {
                const from = positions.get(edge.from);
                const to = positions.get(edge.to);
                return from && to ? (
                  <line
                    key={`${edge.from}:${edge.to}`}
                    x1={from.x + 80}
                    y1={from.y + 38}
                    x2={to.x + 80}
                    y2={to.y + 38}
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={edge.kind === "detour" ? "8 8" : undefined}
                  />
                ) : null;
              })}
            </svg>
            {bosses.map((boss) => {
              const cleared = bossClears.includes(boss.level);
              return (
                <button
                  key={boss.id}
                  type="button"
                  aria-label={`達成度 ${boss.level}のボス${cleared ? "（撃破済み）" : ""}`}
                  aria-pressed={selected === boss.id}
                  tabIndex={focused === boss.id ? 0 : -1}
                  ref={(node) => {
                    if (node) nodes.current.set(boss.id, node);
                    else nodes.current.delete(boss.id);
                  }}
                  onFocus={() => {
                    setFocused(boss.id);
                    setSelected(boss.id);
                  }}
                  onClick={(event) => {
                    setSelected(boss.id);
                    if (event.detail === 0 && canFightBoss(boss))
                      onBoss?.(boss.level);
                  }}
                  className={`absolute w-40 rounded-xl border bg-background/95 p-3 text-left text-sm shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected === boss.id ? "border-primary ring-2 ring-primary/30" : cleared ? "border-amber-500/20 text-muted-foreground" : "border-rose-500/60 text-rose-400"}`}
                  style={{
                    left: positions.get(boss.id)?.x,
                    top: positions.get(boss.id)?.y,
                  }}
                >
                  <Crown className="mb-1 size-6" />
                  <span className="block font-medium">
                    ボス · 達成度 {boss.level}
                  </span>
                  <span className="block text-xs">
                    {cleared ? "撃破済み" : "撃破で専門分野を開放"}
                  </span>
                </button>
              );
            })}
            {chests.map((chest) => {
              const opened = Boolean(openedChests[chest.region]);
              const Icon = opened ? PackageOpen : Archive;
              const current = map.current === chest.id;
              return (
                <button
                  key={chest.id}
                  type="button"
                  aria-label={`領域 ${chest.region + 1}の宝箱${opened ? "（開封済み）" : ""}`}
                  aria-current={current ? "location" : undefined}
                  aria-pressed={selected === chest.id}
                  tabIndex={focused === chest.id ? 0 : -1}
                  ref={(node) => {
                    if (node) nodes.current.set(chest.id, node);
                    else nodes.current.delete(chest.id);
                  }}
                  onFocus={() => {
                    setFocused(chest.id);
                    setSelected(chest.id);
                  }}
                  onClick={(event) => {
                    setSelected(chest.id);
                    if (event.detail === 0 && !disabled && canTravel(chest.id))
                      onMove(chest.id);
                  }}
                  className={`absolute w-40 rounded-xl border bg-background/95 p-3 text-left text-sm shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${current ? "border-primary ring-4 ring-primary/20" : selected === chest.id ? "border-primary ring-2 ring-primary/30" : opened ? "border-amber-500/20 text-muted-foreground" : "border-amber-500/60 text-amber-500"}`}
                  style={{
                    left: positions.get(chest.id)?.x,
                    top: positions.get(chest.id)?.y,
                  }}
                >
                  {current && (
                    <UserAvatar
                      user={player}
                      className="absolute -top-9 left-1/2 size-10 -translate-x-1/2 border-2 border-primary shadow-lg"
                    />
                  )}
                  <span className="block text-xs">領域 {chest.region + 1}</span>
                  <span className="flex items-center gap-2 font-medium">
                    <Icon className="size-6" />
                    {opened ? "開いた宝箱" : "宝箱"}
                  </span>
                </button>
              );
            })}
            {(showEntranceFacilities ? dungeons : []).map((dungeon) => {
              const id = worldId(dungeon.id);
              const point = positions.get(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={`ダンジョン ${dungeon.name}`}
                  aria-pressed={selected === id}
                  tabIndex={focused === id ? 0 : -1}
                  ref={(node) => {
                    if (node) nodes.current.set(id, node);
                    else nodes.current.delete(id);
                  }}
                  onFocus={() => {
                    setFocused(id);
                    setSelected(id);
                  }}
                  onClick={(event) => {
                    setSelected(id);
                    if (event.detail === 0 && !disabled) {
                      onDungeon?.(dungeon.id);
                    }
                  }}
                  className={`absolute w-40 rounded-xl border bg-background/95 p-3 text-left text-sm shadow-lg ${selected === id ? "border-primary ring-2 ring-primary/30" : "border-emerald-500/50"}`}
                  style={{ left: point?.x, top: point?.y }}
                >
                  <span className="block text-xs text-emerald-500">
                    開放済みダンジョン
                  </span>
                  <span className="line-clamp-2 font-medium">
                    {dungeon.name}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    達成度 {dungeon.achievement ?? 0} · 開拓{" "}
                    {dungeon.exploredPlaces ?? 0}
                    地点
                  </span>
                </button>
              );
            })}
            {showEntranceFacilities && (
              <button
                type="button"
                aria-label="回復場所"
                aria-pressed={selected === RECOVERY}
                tabIndex={focused === RECOVERY ? 0 : -1}
                ref={(node) => {
                  if (node) nodes.current.set(RECOVERY, node);
                  else nodes.current.delete(RECOVERY);
                }}
                onFocus={() => {
                  setFocused(RECOVERY);
                  setSelected(RECOVERY);
                }}
                onClick={(event) => {
                  keyboardNavigation.current = event.detail === 0;
                  setSelected(RECOVERY);
                  if (
                    keyboardNavigation.current &&
                    !disabled &&
                    canTravel(RECOVERY)
                  )
                    onMove(RECOVERY);
                }}
                className={`absolute w-40 rounded-xl border bg-background/95 p-3 text-left text-sm shadow-lg hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected === RECOVERY ? "border-primary ring-2 ring-primary/30" : "border-sky-500/50"}`}
                style={{
                  left: positions.get(RECOVERY)?.x,
                  top: positions.get(RECOVERY)?.y,
                }}
              >
                <span className="block text-xs text-sky-500">入口の施設</span>
                <span className="font-medium">回復場所</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  HP全回復 · 1歩
                </span>
              </button>
            )}
            {[...allIds, ...fresh.map((item) => item.knowledge.uid)].map(
              (id, i) => {
                const point = positions.get(id);
                const item = sentences.get(id);
                const current = id === map.current;
                const unexplored = i >= allIds.length;
                const label =
                  id === ENTRANCE
                    ? "入口"
                    : item?.term?.names?.[0] || item?.sentence || `地点 ${i}`;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-current={current ? "location" : undefined}
                    aria-pressed={selected === id}
                    tabIndex={
                      id === (positions.has(focused) ? focused : map.current)
                        ? 0
                        : -1
                    }
                    ref={(node) => {
                      if (node) nodes.current.set(id, node);
                      else nodes.current.delete(id);
                    }}
                    onFocus={() => {
                      setFocused(id);
                      setSelected(id);
                    }}
                    onClick={(event) => {
                      keyboardNavigation.current = event.detail === 0;
                      setSelected(id);
                      if (
                        keyboardNavigation.current &&
                        !disabled &&
                        canTravel(id)
                      ) {
                        if (id === ENTRANCE && onRestart) onRestart();
                        else
                          onMove(
                            id,
                            candidates.find((item) => item.knowledge.uid === id)
                              ?.kind,
                          );
                      } else if (keyboardNavigation.current) {
                        primaryAction.current?.focus();
                      }
                    }}
                    className={`absolute w-40 rounded-xl border bg-background/95 p-3 text-left text-sm shadow-lg hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${current ? "border-primary ring-4 ring-primary/20" : unexplored ? "border-dashed border-primary/60" : "border-border"}`}
                    style={{ left: point?.x, top: point?.y }}
                  >
                    {current && (
                      <UserAvatar
                        user={player}
                        className="absolute -top-9 left-1/2 size-10 -translate-x-1/2 border-2 border-primary shadow-lg"
                      />
                    )}
                    <span className="block text-xs text-muted-foreground">
                      {current
                        ? id === ENTRANCE
                          ? "現在地 · 入口"
                          : `現在地 · 領域 ${map.places[i - 1].region + 1}`
                        : unexplored
                          ? `未探索 · 領域 ${Math.floor(map.places.length / PLACES_PER_REGION) + 1}`
                          : id === ENTRANCE
                            ? "入口"
                            : `領域 ${map.places[i - 1].region + 1}`}
                    </span>
                    <span className="line-clamp-2 font-medium">{label}</span>
                    {unavailableIds.includes(id) && (
                      <span className="text-xs text-muted-foreground">
                        利用不可
                      </span>
                    )}
                  </button>
                );
              },
            )}
          </div>
        </div>
      </div>
      <header
        aria-label="ダンジョン情報"
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 border-b bg-background/95 px-3 py-2 shadow-sm"
      >
        <div className="pointer-events-auto min-w-0 flex-1">
          {title && (
            <h2 className="truncate text-sm font-semibold" title={title}>
              {title}
            </h2>
          )}
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-1">
          <MusicControls />
          <RegionEnemies
            enemies={enemiesByRegion}
            quizzes={quizzes}
            currentRegion={
              map.places.find((place) => place.id === map.current)?.region ??
              currentChest?.region
            }
          />
          <Button
            size="icon"
            variant="ghost"
            ref={fullButton}
            aria-label={fullscreen ? "全画面を終了" : "マップを全画面表示"}
            title="全画面切り替え (f)"
            onClick={toggleFullscreen}
          >
            <Maximize className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="現在地へ"
            onClick={center}
          >
            <LocateFixed className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="拡大"
            disabled={zoom >= 1.5}
            onClick={() => setZoom((value) => Math.min(1.5, value + 0.25))}
          >
            <Plus className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="縮小"
            disabled={zoom <= 0.5}
            onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
          >
            <Minus className="size-4" />
          </Button>
        </div>
      </header>
      {playerStatus && (
        <div
          aria-label="プレイヤー情報"
          className="absolute left-3 top-16 max-w-[calc(100%-9rem)] rounded-lg border bg-background/95 px-2 py-1.5 shadow-lg sm:max-w-[calc(50%-1.125rem)] sm:px-3 sm:py-2"
        >
          {playerStatus}
        </div>
      )}
      <aside
        aria-label="冒険の進行状況"
        className="absolute right-3 top-16 max-w-[calc(50%-1.125rem)] rounded-xl border bg-background/95 px-3 py-2 shadow-lg"
      >
        {remainingMoves !== undefined && (
          <output
            aria-label="残り移動数"
            className="flex items-center justify-center gap-2 text-primary"
            title="残り移動数"
          >
            <Footprints aria-hidden="true" className="size-7" />
            <span className="text-4xl font-bold leading-none tabular-nums">
              {remainingMoves}
            </span>
            <span className="sr-only">歩</span>
          </output>
        )}
        <div className="mt-2 space-y-1 text-center text-xs text-muted-foreground tabular-nums">
          <h3>
            現在地 ·{" "}
            {currentChest
              ? `領域 ${currentChest.region + 1}の宝箱`
              : map.current === ENTRANCE
                ? "入口"
                : `第${index + 1}地点`}
          </h3>
          <p>
            開拓 {map.places.length}地点
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">
              達成度 {Math.floor(map.places.length / 5)}
            </span>
          </p>
        </div>
        {status && <div className="mt-1 text-center">{status}</div>}
        {recoveryStatus && (
          <div className="mt-2 text-center text-xs text-muted-foreground">
            {recoveryStatus}
          </div>
        )}
      </aside>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-center gap-2">
        <div className="pointer-events-auto max-w-full space-y-2 text-xs">
          {children}
        </div>
        {exhaustedMessage && !selectedChest ? (
          <section
            aria-label="歩数回復の案内"
            className="pointer-events-auto max-h-[35dvh] w-full overflow-y-auto rounded-xl border bg-background/95 p-3 shadow-xl sm:max-w-lg"
          >
            {exhaustedMessage}
          </section>
        ) : (
          selected && (
            <section
              aria-label="選択した地点"
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                event.preventDefault();
                event.stopPropagation();
                closeSelection();
              }}
              className="pointer-events-auto relative max-h-[35dvh] w-full overflow-y-auto rounded-xl border bg-background/95 p-3 shadow-xl sm:max-w-lg"
            >
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1"
                aria-label="地点の選択を閉じる"
                onClick={closeSelection}
              >
                <X className="size-4" />
              </Button>
              <div className="pr-8">
                {candidate && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    未探索 · 領域{" "}
                    {Math.floor(map.places.length / PLACES_PER_REGION) + 1}
                  </p>
                )}
                {selectedBoss ? (
                  <h3 className="font-medium">
                    達成度 {selectedBoss.level}のボス
                  </h3>
                ) : selectedChest ? (
                  <h3 className="font-medium">
                    領域 {selectedChest.region + 1}の宝箱
                  </h3>
                ) : selectedDungeon ? (
                  <h3 className="font-medium">{selectedDungeon.name}</h3>
                ) : selected === RECOVERY ? (
                  <h3 className="font-medium">回復場所</h3>
                ) : (
                  <PathTerms knowledge={chosen} />
                )}
                {unavailableIds.includes(selected) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    現在利用できない単文です。開拓履歴は保持されています。
                  </p>
                )}
                <p className="mt-2 text-sm leading-relaxed">
                  {selectedBoss
                    ? bossClears.includes(selectedBoss.level)
                      ? "撃破済みのボスです。再挑戦できます。"
                      : "この領域の最後の地点から挑戦できます。撃破で専門分野を開放します。"
                    : selectedChest
                      ? chestReward
                        ? chestMessage(chestReward)
                        : map.current === selectedChest.last
                          ? "何が入っているだろう？"
                          : "領域の最後の地点から開けられます。"
                      : selectedDungeon
                        ? "ダンジョンへ移動"
                        : selected === RECOVERY
                          ? "1歩使ってHPを全回復します。"
                          : selected === ENTRANCE
                            ? "ダンジョンの入口"
                            : (chosen?.sentence ?? "単文詳細を開く")}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedBoss && (
                  <Button
                    size="sm"
                    ref={primaryAction}
                    disabled={!canFightBoss(selectedBoss)}
                    onClick={() => onBoss?.(selectedBoss.level)}
                  >
                    {bossClears.includes(selectedBoss.level)
                      ? "再挑戦 · 1歩"
                      : "ボスに挑戦 · 1歩"}
                  </Button>
                )}
                {selectedDungeon && (
                  <Button
                    ref={primaryAction}
                    disabled={disabled}
                    onClick={() => onDungeon?.(selectedDungeon.id)}
                  >
                    このダンジョンへ移動
                  </Button>
                )}
                {canMove && (
                  <Button
                    size="sm"
                    ref={primaryAction}
                    className="min-h-11 flex-1"
                    onClick={() => {
                      if (selected === ENTRANCE && onRestart) onRestart();
                      else onMove(selected, candidate?.kind);
                    }}
                    aria-label={
                      selectedChest
                        ? "宝箱へ移動"
                        : selected === RECOVERY
                          ? "回復場所へ移動・1歩"
                          : selected === ENTRANCE && onRestart
                            ? "冒険を再開"
                            : candidate
                              ? undefined
                              : `${chosen?.term?.names?.[0] || chosen?.sentence || (selected === ENTRANCE ? "入口" : selected)}へ移動`
                    }
                  >
                    {selectedChest
                      ? chestReward
                        ? "宝箱へ · 歩数消費なし"
                        : "宝箱を開ける · 歩数消費なし"
                      : selected === RECOVERY
                        ? "回復場所へ · 1歩"
                        : selected === ENTRANCE && onRestart
                          ? "冒険を再開"
                          : candidate
                            ? "進む"
                            : "移動 · １歩"}
                  </Button>
                )}
                {!selectedDungeon &&
                  !selectedBoss &&
                  !selectedChest &&
                  selected !== ENTRANCE &&
                  !unavailableIds.includes(selected) && (
                    <Button
                      size="sm"
                      variant="outline"
                      ref={canMove ? undefined : primaryAction}
                      onClick={() => onOpen(selected)}
                    >
                      詳細
                    </Button>
                  )}
              </div>
            </section>
          )
        )}
      </div>
    </section>
  );
  return (
    <Dialog
      open={fullscreen}
      onOpenChange={(open) => {
        if (!open) closeFullscreen();
      }}
    >
      {fullscreen ? (
        <DialogContent
          data-adventure-map-dialog
          className="inset-0 left-0 top-0 flex h-dvh max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 data-[state=open]:animate-none data-[state=closed]:animate-none sm:max-w-none [&>button]:hidden"
          onEscapeKeyDown={(event) => {
            if (selected) {
              event.preventDefault();
              closeSelection();
            }
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => {
              viewport.current?.focus({ preventScroll: true });
              center();
            });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            requestAnimationFrame(() => fullButton.current?.focus());
          }}
        >
          <DialogTitle className="sr-only">冒険マップ</DialogTitle>
          <DialogDescription className="sr-only">
            地点を選択して探索します。Escapeで全画面を終了します。
          </DialogDescription>
          {canvas}
        </DialogContent>
      ) : (
        canvas
      )}
    </Dialog>
  );
}
