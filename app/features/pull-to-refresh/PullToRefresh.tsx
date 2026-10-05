import { RefreshCw } from "lucide-react";
import { type PropsWithChildren, useEffect, useRef, useState } from "react";
import { cn } from "~/shared/lib/utils";

const START_SLOP_PX = 8;
const REFRESH_THRESHOLD_PX = 72;
const MAX_PULL_PX = 112;
const PULL_RESISTANCE = 0.48;

type Props = PropsWithChildren<{
  enabled: boolean;
  className?: string;
  onRefresh: () => Promise<unknown>;
  childrenKey?: React.Key;
}>;

type Gesture = {
  startX: number;
  startY: number;
  axis?: "vertical" | "horizontal";
};

/** モバイルでページ先頭を下へ引いたとき、表示中のデータを更新する。 */
export default function PullToRefresh({
  enabled,
  className,
  onRefresh,
  childrenKey,
  children,
}: Props) {
  const containerRef = useRef<HTMLElement>(null);
  const gestureRef = useRef<Gesture | undefined>(undefined);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    function reset() {
      gestureRef.current = undefined;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    }

    function handleTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      if (
        event.touches.length !== 1 ||
        !touch ||
        refreshingRef.current ||
        (container?.scrollTop ?? 0) > 0
      ) {
        reset();
        return;
      }
      gestureRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
      };
    }

    function handleTouchMove(event: TouchEvent) {
      const gesture = gestureRef.current;
      const touch = event.touches[0];
      if (!gesture || !touch || (container?.scrollTop ?? 0) > 0) {
        reset();
        return;
      }
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      if (deltaY <= 0) {
        reset();
        return;
      }
      if (
        !gesture.axis &&
        Math.max(Math.abs(deltaX), deltaY) >= START_SLOP_PX
      ) {
        gesture.axis =
          deltaY > Math.abs(deltaX) * 1.25 ? "vertical" : "horizontal";
      }
      if (gesture.axis === "horizontal") {
        reset();
        return;
      }
      if (gesture.axis !== "vertical") return;

      event.preventDefault();
      const distance = Math.min(MAX_PULL_PX, deltaY * PULL_RESISTANCE);
      pullDistanceRef.current = distance;
      setPullDistance(distance);
    }

    function handleTouchEnd() {
      const shouldRefresh = pullDistanceRef.current >= REFRESH_THRESHOLD_PX;
      reset();
      if (!shouldRefresh || refreshingRef.current) return;
      refreshingRef.current = true;
      setRefreshing(true);
      void onRefresh().finally(() => {
        refreshingRef.current = false;
        setRefreshing(false);
      });
    }

    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", reset);
    };
  }, [enabled, onRefresh]);

  const visibleDistance = refreshing ? 44 : pullDistance;
  const ready = pullDistance >= REFRESH_THRESHOLD_PX;

  return (
    <main
      ref={containerRef}
      className={className}
      data-pull-to-refresh={enabled || undefined}
    >
      {enabled && (
        <output
          className="flex items-center justify-center gap-2 overflow-hidden text-xs text-muted-foreground transition-[height] duration-150"
          style={{ height: visibleDistance }}
          aria-live="polite"
        >
          <RefreshCw
            className={cn("size-4", refreshing && "animate-spin")}
            style={
              refreshing
                ? undefined
                : {
                    transform: `rotate(${Math.min(180, pullDistance * 2)}deg)`,
                  }
            }
            aria-hidden="true"
          />
          <span>
            {refreshing ? "更新中…" : ready ? "離して更新" : "引いて更新"}
          </span>
        </output>
      )}
      <div key={childrenKey}>{children}</div>
    </main>
  );
}
