import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  type ComponentProps,
  type ReactNode,
  createContext,
  useContext,
} from "react";
import { Button } from "~/shared/components/ui/button";

const HandleContext = createContext<ReturnType<typeof useSortable> | null>(
  null,
);

export function SortableRows<T extends { id: string }>({
  rows,
  onReorder,
  children,
}: {
  rows: T[];
  onReorder: (rows: T[]) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = rows.findIndex((row) => row.id === active.id);
        const to = rows.findIndex((row) => row.id === over.id);
        if (from >= 0 && to >= 0) onReorder(arrayMove(rows, from, to));
      }}
    >
      <SortableContext items={rows} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export function SortableRow({
  id,
  style,
  ...props
}: ComponentProps<"tr"> & { id: string }) {
  const sortable = useSortable({ id });
  return (
    <HandleContext.Provider value={sortable}>
      <tr
        {...props}
        ref={sortable.setNodeRef}
        style={{
          ...style,
          transform: CSS.Transform.toString(sortable.transform),
          transition: sortable.transition,
          position: "relative",
          zIndex: sortable.isDragging ? 1 : undefined,
          opacity: sortable.isDragging ? 0.6 : undefined,
        }}
      />
    </HandleContext.Provider>
  );
}

export function RowDragHandle() {
  const sortable = useContext(HandleContext);
  if (!sortable) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 touch-none cursor-grab active:cursor-grabbing"
      ref={sortable.setActivatorNodeRef}
      {...sortable.attributes}
      {...sortable.listeners}
      aria-label="ドラッグして並べ替え"
      title="ドラッグして並べ替え（Spaceで掴み、矢印で移動）"
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </Button>
  );
}
