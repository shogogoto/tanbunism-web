import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "~/shared/components/ui/button";

export function moveRow<T>(rows: T[], index: number, direction: -1 | 1): T[] {
  const next = [...rows];
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= next.length) return next;
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}

export default function RowOrder({
  index,
  count,
  onMove,
}: {
  index: number;
  count: number;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="min-w-6 text-right tabular-nums">{index + 1}</span>
      <div className="flex flex-col">
        {([-1, 1] as const).map((direction) => {
          const Icon = direction === -1 ? ArrowUp : ArrowDown;
          const label = direction === -1 ? "上へ移動" : "下へ移動";
          return (
            <Button
              key={direction}
              type="button"
              variant="ghost"
              className="size-6 p-0"
              aria-label={label}
              title={label}
              disabled={direction === -1 ? index === 0 : index === count - 1}
              onClick={() => onMove(direction)}
            >
              <Icon className="size-3" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
