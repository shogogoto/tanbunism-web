import { Link, NavLink } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import ThemeToggle from "~/shared/components/theme/ThemeToggle";
import { Button } from "~/shared/components/ui/button";
import { HistoryPanel } from "~/shared/history/HistoryPanel";
import UserNavi from "./UserNavi";
import { SiteLogo } from "./components/SiteLogo";

const primaryLinks = [
  { to: "/docs/toc", label: "ドキュメント" },
  { to: "/search", label: "検索" },
  { to: "/quiz", label: "クイズ" },
  { to: "/quiz/list", label: "作成したクイズ" },
  { to: "/achievement", label: "学習記録" },
];

export default function AppHeader() {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="z-40 shrink-0 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 md:px-6">
        <Link
          to="/"
          className="mr-2 flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Tanbun トップ"
        >
          <SiteLogo />
          <span className="hidden font-semibold sm:inline">Tanbun</span>
        </Link>

        <nav
          className="hidden h-full items-center gap-1 md:flex"
          aria-label="主要"
        >
          {primaryLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-full items-center border-b-2 px-3 text-sm transition-colors ${
                  isActive
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <HistoryPanel showLabel />
          <ThemeToggle
            buttonClassName="inline-flex size-9 items-center justify-center hover:bg-accent"
            iconClassName="size-4"
          />
          {isAuthenticated ? (
            <UserNavi user={user} side="bottom" />
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">ログイン</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/register">登録</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
