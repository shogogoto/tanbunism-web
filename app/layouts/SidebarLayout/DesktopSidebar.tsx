import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  LayoutDashboard,
  ListChecks,
  Search,
} from "lucide-react";
import { Link, NavLink } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import ThemeToggle from "~/shared/components/theme/ThemeToggle";
import { Button } from "~/shared/components/ui/button";
import { HistoryPanel } from "~/shared/history/HistoryPanel";
import UserNavi from "./UserNavi";
import { SiteLogo } from "./components/SiteLogo";

const links = [
  { to: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { to: "/docs/toc", label: "ドキュメント", icon: BookOpen },
  { to: "/search", label: "検索", icon: Search },
  { to: "/quiz", label: "クイズ", icon: FileQuestion },
  { to: "/quiz/list", label: "作成したクイズ", icon: ListChecks },
] as const;

type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

export default function DesktopSidebar({ collapsed, onToggle }: Props) {
  const { user, isAuthenticated } = useAuth();

  return (
    <aside
      className={`hidden shrink-0 border-r bg-background transition-[width] duration-200 md:flex md:flex-col ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex h-14 items-center justify-between border-b px-3">
        <Link
          to={isAuthenticated ? "/about" : "/"}
          className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Tanbun トップ"
        >
          <SiteLogo />
          {!collapsed && (
            <span className="truncate font-semibold">Tanbunism</span>
          )}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onToggle}
          aria-label={collapsed ? "サイドバーを開く" : "サイドバーを閉じる"}
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2" aria-label="主要">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/dashboard" || to === "/quiz"}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              } ${collapsed ? "justify-center px-2" : ""}`
            }
          >
            <Icon className="size-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div
        className={`flex items-center border-t p-2 ${
          collapsed ? "flex-col gap-1" : "justify-between"
        }`}
      >
        <div className={collapsed ? "contents" : "flex items-center gap-1"}>
          <HistoryPanel showLabel={!collapsed} />
          <ThemeToggle
            buttonClassName="inline-flex size-9 items-center justify-center hover:bg-accent"
            iconClassName="size-4"
          />
        </div>
        {isAuthenticated && <UserNavi user={user} side="right" />}
      </div>
    </aside>
  );
}
