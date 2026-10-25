import type { ComponentProps } from "react";
import { Table } from "~/shared/components/ui/table";
import { cn } from "~/shared/lib/utils";

const columnDividers =
  "[&_tr>th:not(:last-child)]:border-r [&_tr>td:not(:last-child)]:border-r";
type TableLayout = "content" | "full";
const layouts: Record<TableLayout, string> = {
  content: "mx-auto w-auto",
  full: "w-full",
};

function adminTableClassName(
  className: string | undefined,
  layout: TableLayout,
) {
  return cn(columnDividers, className, layouts[layout]);
}

/** Shared borders and width policy; only the UI-table variant adds a scroll container. */
export function AdminNativeTable({
  className,
  layout = "full",
  ...props
}: ComponentProps<"table"> & { layout?: TableLayout }) {
  return (
    <table
      className={adminTableClassName(className, layout)}
      data-admin-layout={layout}
      {...props}
    />
  );
}

export function AdminTable({
  className,
  layout = "full",
  ...props
}: ComponentProps<typeof Table> & { layout?: TableLayout }) {
  return (
    <Table
      className={adminTableClassName(className, layout)}
      data-admin-layout={layout}
      {...props}
    />
  );
}
