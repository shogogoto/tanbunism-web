import { useSearchParams } from "react-router";
import { dashboardSections, isDashboardSection } from "./sections";

export default function DashboardHeaderTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("view");
  const active = isDashboardSection(requested) ? requested : "timeline";

  return (
    <nav
      aria-label="ダッシュボードの表示切り替え"
      role="tablist"
      className="flex max-w-full justify-start gap-6 overflow-x-auto px-3 sm:justify-center md:px-6"
    >
      {dashboardSections.map((section, index) => (
        <button
          key={section.id}
          type="button"
          role="tab"
          aria-label={section.label}
          aria-selected={active === section.id}
          title={`Ctrl+${index + 1}`}
          className={`relative inline-flex shrink-0 items-center gap-1.5 px-1 py-2 text-sm transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 ${
            active === section.id
              ? "font-medium text-foreground after:bg-primary"
              : "text-muted-foreground hover:text-foreground after:bg-transparent"
          }`}
          onClick={() => {
            setSearchParams((current) => {
              const next = new URLSearchParams(current);
              if (section.id === "timeline") next.delete("view");
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
    </nav>
  );
}
