import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import type { PathKnowledge } from "./api";
import { type DungeonMap, ENTRANCE, neighbours } from "./exploration";

/** Stable first-discovery layout: branches stay put when the player backtracks. */
export default function ExplorationMap({
  map,
  knowledge,
  onOpen,
  onMove,
  disabled,
}: {
  map: DungeonMap;
  knowledge: PathKnowledge[];
  onOpen: (id: string) => void;
  onMove: (id: string) => void;
  disabled: boolean;
}) {
  const sentences = new Map(knowledge.map((item) => [item.uid, item]));
  const viewport = useRef<HTMLDivElement>(null);
  const adjacent = neighbours(map);
  const allIds = [ENTRANCE, ...map.places.map((place) => place.id)];
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
    positions.set(id, { x: 30 + level * 160, y: 30 + row * 105 });
  }
  const width = Math.max(320, ...[...positions.values()].map((p) => p.x + 150));
  const height = Math.max(130, ...[...positions.values()].map((p) => p.y + 95));
  const index = map.places.findIndex((place) => place.id === map.current);
  const currentPosition = positions.get(map.current);
  useEffect(() => {
    viewport.current?.scrollTo?.({
      left: Math.max(
        0,
        (currentPosition?.x ?? 0) -
          (viewport.current.clientWidth ?? 0) / 2 +
          64,
      ),
      top: Math.max(0, (currentPosition?.y ?? 0) - 50),
    });
  }, [currentPosition?.x, currentPosition?.y]);
  return (
    <section
      aria-label="ダンジョンのマップ"
      className="min-w-0 rounded-xl border p-3"
    >
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="size-4 text-primary" />
        現在地 · {map.current === ENTRANCE ? "入口" : `第${index + 1}地点`}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        開拓 {map.places.length}地点 · 達成度{" "}
        {Math.floor(map.places.length / 5)} · 破線は寄り道
      </p>
      <div
        ref={viewport}
        className="mt-3 max-h-80 overflow-auto rounded-lg bg-muted/20"
        aria-label="探索マップをスクロール"
      >
        <div className="relative" style={{ width, height }}>
          <svg
            aria-hidden="true"
            className="absolute inset-0 text-primary/40"
            width={width}
            height={height}
          >
            {map.edges.map((edge) => {
              const from = positions.get(edge.from);
              const to = positions.get(edge.to);
              if (!from || !to) return null;
              return (
                <line
                  key={`${edge.from}:${edge.to}`}
                  x1={from.x + 60}
                  y1={from.y + 28}
                  x2={to.x + 60}
                  y2={to.y + 28}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={edge.kind === "detour" ? "5 5" : undefined}
                />
              );
            })}
          </svg>
          {allIds.map((id, i) => {
            const point = positions.get(id);
            const item = sentences.get(id);
            const current = map.current === id;
            const canMove = !disabled && !current && adjacent.includes(id);
            const label =
              id === ENTRANCE
                ? "入口"
                : item?.term?.names?.[0] || item?.sentence || `地点 ${i}`;
            return (
              <div
                key={id}
                className="absolute w-32"
                style={{ left: point?.x, top: point?.y }}
              >
                <button
                  type="button"
                  aria-current={current ? "location" : undefined}
                  onClick={() => id !== ENTRANCE && onOpen(id)}
                  className={`w-full rounded-lg border bg-background p-2 text-left text-xs hover:bg-muted ${current ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                >
                  <span className="block text-muted-foreground">
                    {current
                      ? "現在地"
                      : id === ENTRANCE
                        ? "入口"
                        : `領域 ${map.places[i - 1].region + 1}`}
                  </span>
                  <span className="line-clamp-2 font-medium">{label}</span>
                </button>
                {canMove && (
                  <button
                    type="button"
                    className="mt-1 w-full rounded border bg-background px-2 py-1 text-xs hover:bg-muted"
                    onClick={() => onMove(id)}
                    aria-label={`${label}へ移動`}
                  >
                    移動 · １歩
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
