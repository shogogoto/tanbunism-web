import type { ComponentProps, ReactNode } from "react";
import { AdminNativeTable, AdminTableFrame } from "~/features/admin/AdminTable";
import { SortableRows } from "./SortableRows";
import useTableSort from "./useTableSort";

/** Shared layout, column sorting, and manual ordering based on the visible rows. */
export default function SortableAdminTable<T extends { id: string }>({
  rows,
  value,
  onReorder,
  children,
  ...props
}: Omit<ComponentProps<typeof AdminNativeTable>, "children"> & {
  rows: T[];
  value: (row: T, column: string) => string | number;
  onReorder: (rows: T[]) => void;
  children: (table: ReturnType<typeof useTableSort<T>>) => ReactNode;
}) {
  const table = useTableSort(rows, value);
  return (
    <AdminTableFrame layout="content">
      <SortableRows
        rows={table.sorted}
        onReorder={(next) => {
          onReorder(next);
          table.resetSort();
        }}
      >
        <AdminNativeTable layout="content" {...props}>
          {children(table)}
        </AdminNativeTable>
      </SortableRows>
    </AdminTableFrame>
  );
}
