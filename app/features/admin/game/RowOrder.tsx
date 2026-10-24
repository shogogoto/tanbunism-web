import { RowDragHandle } from "./SortableRows";

export default function RowOrder({ index }: { index: number }) {
  return (
    <div className="flex items-center gap-1">
      <RowDragHandle />
      <span className="min-w-6 text-right tabular-nums">{index + 1}</span>
    </div>
  );
}
