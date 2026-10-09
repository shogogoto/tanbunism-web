import { useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { cn } from "~/shared/lib/utils";

export default function SectionHeaderTabs({
  sections,
  label,
  compact = false,
  active: controlledActive,
  onSelect,
}: {
  sections: readonly { id: string; label: string; progress?: string }[];
  label: string;
  compact?: boolean;
  active?: string;
  onSelect?: (id: string) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });
  const requested = controlledActive ?? searchParams.get("view");
  const active = sections.some((section) => section.id === requested)
    ? requested
    : sections[0].id;
  const activeIndex = sections.findIndex((section) => section.id === active);

  useLayoutEffect(() => {
    const tab = tabRefs.current[activeIndex];
    if (!tab) return;
    const activeTab = tab;

    function updateIndicator() {
      setIndicator({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
        ready: true,
      });
    }

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(updateIndicator);
    observer?.observe(activeTab);
    return () => {
      window.removeEventListener("resize", updateIndicator);
      observer?.disconnect();
    };
  }, [activeIndex]);

  return (
    <nav
      aria-label={label}
      role="tablist"
      className={cn(
        "relative flex max-w-full justify-start gap-6 overflow-x-auto px-3 sm:justify-center md:px-6",
        compact && "gap-2 px-0 sm:gap-4 sm:px-3 md:px-3",
      )}
    >
      {sections.map((section, index) => (
        <button
          key={section.id}
          ref={(element) => {
            tabRefs.current[index] = element;
          }}
          type="button"
          role="tab"
          aria-label={section.label}
          aria-selected={active === section.id}
          title={`Ctrl+${index + 1}`}
          className={`relative inline-flex shrink-0 items-center gap-1.5 px-1 py-2 text-sm transition-colors ${
            active === section.id
              ? "font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => {
            if (onSelect) {
              onSelect(section.id);
              return;
            }
            setSearchParams((current) => {
              const next = new URLSearchParams(current);
              if (section.id === sections[0].id) next.delete("view");
              else next.set("view", section.id);
              return next;
            });
          }}
          onKeyDown={(event) => {
            if (!onSelect) return;
            const nextIndex =
              event.key === "ArrowRight"
                ? (index + 1) % sections.length
                : event.key === "ArrowLeft"
                  ? (index + sections.length - 1) % sections.length
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? sections.length - 1
                      : undefined;
            if (nextIndex === undefined) return;
            event.preventDefault();
            tabRefs.current[nextIndex]?.focus();
            onSelect(sections[nextIndex].id);
          }}
          tabIndex={onSelect && active !== section.id ? -1 : 0}
        >
          <kbd className="min-w-3 text-center font-mono text-[10px] leading-none text-muted-foreground">
            {index + 1}
          </kbd>
          {section.label}
          {section.progress && (
            <span className="font-normal tabular-nums text-xs text-muted-foreground">
              {section.progress}
            </span>
          )}
        </button>
      ))}
      <span
        aria-hidden="true"
        data-dashboard-tab-indicator
        data-active-tab={active}
        className={`pointer-events-none absolute bottom-0 h-0.5 bg-primary transition-[left,width,opacity] duration-200 ease-out motion-reduce:transition-none ${indicator.ready ? "opacity-100" : "opacity-0"}`}
        style={{ left: indicator.left, width: indicator.width }}
      />
    </nav>
  );
}
