import { useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

export default function SectionHeaderTabs({
  sections,
  label,
}: {
  sections: readonly { id: string; label: string }[];
  label: string;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });
  const requested = searchParams.get("view");
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
      className="relative flex max-w-full justify-start gap-6 overflow-x-auto px-3 sm:justify-center md:px-6"
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
            setSearchParams((current) => {
              const next = new URLSearchParams(current);
              if (section.id === sections[0].id) next.delete("view");
              else next.set("view", section.id);
              return next;
            });
          }}
        >
          <kbd className="min-w-3 text-center font-mono text-[10px] leading-none text-muted-foreground">
            {index + 1}
          </kbd>
          {section.label}
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
