import { LayoutDashboard, Search, SquareCheckBig } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";

export default function BottomNavigation() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated && (
        <NavigationItem
          to="/dashboard"
          label="ダッシュボード"
          icon={<LayoutDashboard />}
        />
      )}
      <NavigationItem to="/search" label="検索" icon={<Search />} />
      <NavigationItem to="/quiz" label="クイズ" icon={<SquareCheckBig />} />
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
