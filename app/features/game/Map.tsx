import {
  Footprints,
  LocateFixed,
  Maximize,
  Minus,
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
import PathTerms from "./PathTerms";
import RegionEnemies from "./RegionEnemies";
import type { DungeonContent, PathKnowledge, RegionEnemy } from "./api";
import { type DungeonMap, ENTRANCE } from "./exploration";
import { directionalPlace } from "./navigation";

export type MapCandidate = {
  knowledge: PathKnowledge;
  kind: "relation" | "detour";
};

export default function ExplorationMap({
  map,
  knowledge,
  candidates = [],
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
  playerStatus,
  children,
}: {
  map: DungeonMap;
  knowledge: PathKnowledge[];
  candidates?: MapCandidate[];
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
  playerStatus?: ReactNode;
  children?: ReactNode;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [focused, setFocused] = useState(map.current);
  const nodes = useRef(new Map<string, HTMLButtonElement>());
  const primaryAction = useRef<HTMLButtonElement>(null);
  const keyboardNavigation = useRef(false);
  const [zoom, setZoom] = useState(1);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
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
  const fresh = candidates.filter(
    (item) => !allIds.includes(item.knowledge.uid),
  );
  const levels = new Map<string, number>([[ENTRANCE, 0]]);
  const positions = new Map<string, { x: number; y: number }>();
  const columns = new Map<number, number>();
  for (const id of allIds) {
    const parent = map.edges.find((edge) => edge.to === id);
    const level =
      id === ENTRANCE ? 0 : (levels.get(parent?.from ?? ENTRANCE) ?? 0) + 1;
    levels.set(id, level);
    const row = columns.get(level) ?? 0;
    columns.set(level, row + 1);
    positions.set(
      id,
      narrow
        ? { x: 360 + row * 200, y: 220 + level * 150 }
        : { x: 360 + level * 230, y: 220 + row * 150 },
    );
  }
  const candidateLevel = (levels.get(map.current) ?? 0) + 1;
  for (const item of fresh) {
    const row = columns.get(candidateLevel) ?? 0;
    columns.set(candidateLevel, row + 1);
    positions.set(
      item.knowledge.uid,
      narrow
        ? {
            x: 360 + row * 200,
            y: 220 + candidateLevel * 150,
          }
        : {
            x: 360 + candidateLevel * 230,
            y: 220 + row * 150,
          },
    );
  }
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
  }, [currentPosition?.x, currentPosition?.y, zoom, fullscreen]);
  // The fullscreen portal mounts after the first effect; resize also happens on rotation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: center uses current canvas dimensions.
  useEffect(() => {
    const element = viewport.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(center);
    observer.observe(element);
    return () => observer.disconnect();
  }, [currentPosition?.x, currentPosition?.y, zoom, fullscreen]);
  useEffect(() => {
    if (map.current) {
      setSelected(undefined);
      setFocused(map.current);
      if (keyboardNavigation.current) {
        nodes.current.get(map.current)?.focus({ preventScroll: true });
      }
    }
  }, [map.current]);
  function focusPlace(id: string) {
    setFocused(id);
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
    setSelected(undefined);
    if (previous) focusPlace(previous);
  }
  const chosen = selected ? sentences.get(selected) : undefined;
  const candidate = candidates.find((item) => item.knowledge.uid === selected);
  const canMove =
    !disabled &&
    !unavailableIds.includes(selected ?? "") &&
    selected !== map.current &&
    Boolean(selected && (allIds.includes(selected) || candidate));
  const index = map.places.findIndex((place) => place.id === map.current);
  const canvas = (
    <section
      ref={mapElement}
      aria-label="ダンジョンのマップ"
      className={`relative isolate min-w-0 overflow-hidden bg-background ${fullscreen ? "h-dvh w-full" : "h-[calc(100dvh-11rem)] min-h-[440px] rounded-xl border sm:h-[calc(100dvh-7rem)]"}`}
    >
      <div
        ref={viewport}
        aria-label="探索マップをスクロール"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: map entry point supports spatial keyboard navigation.
        tabIndex={0}
        onKeyDown={(event) => {
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
              {[
                ...map.edges,
                ...fresh.map((item) => ({
                  from: map.current,
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
                    onFocus={() => setFocused(id)}
                    onClick={(event) => {
                      keyboardNavigation.current = event.detail === 0;
                      setSelected(id);
                      if (keyboardNavigation.current)
                        requestAnimationFrame(() =>
                          primaryAction.current?.focus(),
                        );
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
                          ? "未探索"
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
        <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-3 overflow-x-auto whitespace-nowrap">
          {title && (
            <h2
              className="max-w-64 shrink-0 truncate text-sm font-semibold"
              title={title}
            >
              {title}
            </h2>
          )}
          <h3 className="shrink-0 text-xs text-muted-foreground">
            現在地 · {map.current === ENTRANCE ? "入口" : `第${index + 1}地点`}
          </h3>
          <span className="shrink-0 text-xs text-muted-foreground">
            開拓 {map.places.length}地点 · 達成度{" "}
            {Math.floor(map.places.length / 5)}
          </span>
        </div>
        <div className="pointer-events-auto flex shrink-0 gap-1">
          <RegionEnemies
            enemies={enemiesByRegion}
            quizzes={quizzes}
            currentRegion={
              map.places.find((place) => place.id === map.current)?.region
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
      {(remainingMoves !== undefined || status) && (
        <aside
          aria-label="冒険の進行状況"
          className="absolute right-3 top-16 rounded-xl border bg-background/95 px-3 py-2 shadow-lg"
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
          {status && <div className="mt-1 text-center">{status}</div>}
        </aside>
      )}
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-center gap-2">
        {playerStatus && (
          <div
            aria-label="プレイヤー情報"
            className="pointer-events-auto self-start rounded-lg border bg-background/95 px-3 py-2 shadow-lg lg:absolute lg:bottom-0 lg:left-0"
          >
            {playerStatus}
          </div>
        )}
        <div className="pointer-events-auto max-w-full space-y-2 text-xs">
          {children}
          <p className="hidden w-fit rounded bg-background/90 px-2 py-1 text-muted-foreground sm:block">
            実線：知識の関係 · 破線：寄り道
            <br />
            矢印：地点を選ぶ · Enter：確認 · Esc：戻る · f：全画面
          </p>
        </div>
        {selected && (
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
              <PathTerms knowledge={chosen} />
              {unavailableIds.includes(selected) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  現在利用できない単文です。開拓履歴は保持されています。
                </p>
              )}
              <p className="mt-2 text-sm leading-relaxed">
                {selected === ENTRANCE
                  ? "ダンジョンの入口"
                  : (chosen?.sentence ?? "単文詳細を開く")}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {canMove && (
                <Button
                  size="sm"
                  ref={primaryAction}
                  className="min-h-11 flex-1"
                  onClick={() => onMove(selected, candidate?.kind)}
                  aria-label={
                    candidate
                      ? undefined
                      : `${chosen?.term?.names?.[0] || chosen?.sentence || (selected === ENTRANCE ? "入口" : selected)}へ移動`
                  }
                >
                  {candidate
                    ? candidate.kind === "detour" && map.current !== ENTRANCE
                      ? "見たよ · 寄り道へ"
                      : "見たよ · この道へ"
                    : "移動 · １歩"}
                </Button>
              )}
              {selected !== ENTRANCE && !unavailableIds.includes(selected) && (
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
