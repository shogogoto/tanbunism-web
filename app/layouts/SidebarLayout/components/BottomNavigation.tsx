import {
  Bell,
  CircleUserRound,
  LayoutDashboard,
  Search,
  SquareCheckBig,
} from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import { NotificationBadge } from "~/features/notifications/NotificationBadge";

export default function BottomNavigation() {
  const { isAuthenticated, user } = useAuth();
  const profilePath = user ? `/user/${user.username || user.uid}` : undefined;

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
      {isAuthenticated && (
        <NavigationItem
          to="/notifications"
          label="通知"
          icon={<Bell />}
          badge={<NotificationBadge compact />}
        />
      )}
      {isAuthenticated && profilePath && (
        <NavigationItem
          to={profilePath}
          label="プロフィール"
          icon={<CircleUserRound />}
        />
      )}
    </>
  );
}

function NavigationItem({
  to,
  label,
  icon,
  badge,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      className={({ isActive }) =>
        `flex size-10 items-center justify-center rounded-md transition-colors ${
          isActive
            ? "bg-accent font-semibold text-primary"
            : "text-muted-foreground"
        }`
      }
    >
      <span className="relative [&>svg]:size-[22px]">
        {icon}
        {badge}
      </span>
    </NavLink>
  );
}
