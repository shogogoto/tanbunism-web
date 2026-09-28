import { NavLink } from "react-router";

const tabs = [
  { to: "/quiz", label: "解く", end: true },
  { to: "/quiz/list", label: "作成済み", end: false },
  { to: "/study-plans", label: "学習計画", end: false },
  { to: "/answers", label: "回答履歴", end: false },
] as const;

export default function QuizHeaderTabs() {
  return (
    <nav
      aria-label="クイズメニュー"
      className="flex max-w-full justify-start gap-6 overflow-x-auto px-3 sm:justify-center md:px-6"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `relative shrink-0 px-1 py-2 text-sm transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 ${
              isActive
                ? "font-medium text-foreground after:bg-primary"
                : "text-muted-foreground hover:text-foreground after:bg-transparent"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
