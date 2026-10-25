import type { ComponentProps } from "react";
import { Table } from "~/shared/components/ui/table";
import { cn } from "~/shared/lib/utils";

const columnDividers =
  "[&_tr>th:not(:last-child)]:border-r [&_tr>td:not(:last-child)]:border-r";

/** Native tables keep their existing container/layout; UI tables keep their scroll wrapper. */
export function AdminNativeTable({
  className,
  ...props
}: ComponentProps<"table">) {
  return <table className={cn(columnDividers, className)} {...props} />;
}

export function AdminTable({
  className,
  ...props
}: ComponentProps<typeof Table>) {
  return <Table className={cn(columnDividers, className)} {...props} />;
}
