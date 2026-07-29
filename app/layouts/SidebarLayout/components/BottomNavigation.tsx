import {
  BookOpen,
  Home,
  PanelLeftIcon,
  Search,
  SquareCheckBig,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { useSidebar } from "~/shared/components/ui/sidebar";

export default function BottomNavigation() {
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="メニューを開く"
        className="flex flex-col items-center gap-1 text-xs"
      >
        <PanelLeftIcon size={22} />
        <span>メニュー</span>
      </button>
      <NavigationItem to="/home" label="ホーム" icon={<Home />} />
      <NavigationItem to="/search" label="検索" icon={<Search />} />
      <NavigationItem to="/quiz" label="クイズ" icon={<SquareCheckBig />} />
      <NavigationItem to="/docs/toc" label="ガイド" icon={<BookOpen />} />
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
