import {
  BookOpen,
  LayoutDashboard,
  Search,
  SquareCheckBig,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";

export default function BottomNavigation() {
  return (
    <>
      <NavigationItem
        to="/dashboard"
        label="ダッシュボード"
        icon={<LayoutDashboard />}
      />
      <NavigationItem to="/search" label="検索" icon={<Search />} />
      <NavigationItem to="/quiz" label="クイズ" icon={<SquareCheckBig />} />
      <NavigationItem to="/docs/toc" label="ドキュメント" icon={<BookOpen />} />
    </>
  );
}

function NavigationItem({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 text-xs ${
          isActive ? "font-semibold text-primary" : "text-muted-foreground"
        }`
      }
    >
      <span className="[&>svg]:size-[22px]">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}
