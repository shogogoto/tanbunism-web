import type { ReactNode } from "react";

/** Keep section tabs and their related controls together, centered in the header. */
export default function SectionHeaderGroup({
  children,
  actions,
}: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-2 px-2">
      <div className="min-w-0 max-w-full">{children}</div>
      {actions && (
        <div className="my-1 flex min-w-0 max-w-full items-center border-l border-border pl-3">
          {actions}
        </div>
      )}
    </div>
  );
}
