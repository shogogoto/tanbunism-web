import { Plus } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "~/shared/components/ui/button";
import { Table } from "~/shared/components/ui/table";
import { cn } from "~/shared/lib/utils";

const columnDividers =
  "[&_tr>th:not(:last-child)]:border-r [&_tr>td:not(:last-child)]:border-r";
type TableLayout = "content" | "full";
const layouts: Record<TableLayout, string> = {
  content: "mx-auto w-auto",
  full: "w-full",
};
const containerLayouts: Record<TableLayout, string> = {
  content: "mx-auto w-fit max-w-full",
  full: "w-full",
};
const frameAppearance =
  "[&_thead]:bg-muted/40 [&_th]:p-2 [&_th]:font-medium [&_td]:p-2 [&_tbody>tr]:border-t";

/** One shared add action for editable tables; never submits the surrounding form. */
export function AdminTableAddRow({
  colSpan,
  label,
  onClick,
  disabled = false,
  compact = false,
}: {
  colSpan: number;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <tr className="border-t">
      <td
        colSpan={colSpan}
        className={compact ? "p-1 text-center" : "text-center"}
      >
        <Button
          type="button"
          variant="ghost"
          size={compact ? "icon" : "default"}
          className={compact ? undefined : "w-full"}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </td>
    </tr>
  );
}

/** Size the heading and controls together with their content-width table. */
export function AdminTableSection({
  title,
  className,
  children,
  ...props
}: Omit<ComponentProps<"section">, "title"> & { title?: ReactNode }) {
  return (
    <section
      className={cn("mx-auto w-fit min-w-0 max-w-full space-y-2", className)}
      data-admin-table-section=""
      {...props}
    >
      {title && <h3 className="font-semibold">{title}</h3>}
      {children}
    </section>
  );
}

/** Keep the scroll frame and its border aligned with the table's width policy. */
export function AdminTableFrame({
  className,
  layout = "full",
  ...props
}: ComponentProps<"div"> & { layout?: TableLayout }) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-lg border",
        frameAppearance,
        className,
        containerLayouts[layout],
      )}
      data-admin-table-frame={layout}
      {...props}
    />
  );
}

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
  containerClassName,
  layout = "full",
  ...props
}: ComponentProps<typeof Table> & { layout?: TableLayout }) {
  return (
    <Table
      containerClassName={cn(containerClassName, containerLayouts[layout])}
      className={adminTableClassName(className, layout)}
      data-admin-layout={layout}
      {...props}
    />
  );
}
