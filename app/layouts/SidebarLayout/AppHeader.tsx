import { Link, useLocation } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import DashboardHeaderTabs from "~/features/dashboard/DashboardHeaderTabs";
import ReviewHeaderTabs from "~/features/review/ReviewHeaderTabs";
import SearchHeaderControls from "~/features/search/SearchHeaderControls";
import ThemeToggle from "~/shared/components/theme/ThemeToggle";
import { Button } from "~/shared/components/ui/button";
import { HistoryPanel } from "~/shared/history/HistoryPanel";
import HeaderXpProgress from "./HeaderXpProgress";
import UserNavi from "./UserNavi";
import { SiteLogo } from "./components/SiteLogo";

export default function AppHeader() {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="z-40 shrink-0 border-b bg-background/95 backdrop-blur">
      <div className="relative flex h-14 items-center gap-2 px-3 md:px-6">
        <Link
          to={isAuthenticated ? "/about" : "/"}
          className="mr-2 flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-label="Tanbun トップ"
        >
          <SiteLogo />
        </Link>

        <div className="absolute left-1/2 flex max-w-[62vw] -translate-x-1/2 items-center gap-2">
          <h1 className="min-w-0 truncate text-sm font-semibold text-foreground">
            {pageTitle(pathname)}
          </h1>
          {isAuthenticated && user && (
            <HeaderXpProgress user={user} className="hidden md:flex" />
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 md:hidden">
          <HistoryPanel />
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
      {pathname === "/dashboard" && <DashboardHeaderTabs />}
      {pathname === "/review" && <ReviewHeaderTabs />}
      {pathname.startsWith("/search") && <SearchHeaderControls />}
    </header>
  );
}

function pageTitle(pathname: string): string {
  if (pathname === "/admin") return "管理";
  if (pathname === "/dashboard") return "ダッシュボード";
  if (pathname === "/review") return "復習";
  if (isQuizSection(pathname)) return "クイズ";
  if (pathname === "/answers") return "回答履歴";
  if (pathname === "/achievement") return "学習記録";
  if (pathname === "/notifications") return "通知";
  if (pathname === "/import") return "インポート";
  if (pathname === "/study-plans") return "学習計画";
  if (pathname.startsWith("/docs")) return "ドキュメント";
  if (pathname.startsWith("/search")) return "検索";
  if (pathname.startsWith("/entry/")) return "Entry";
  if (pathname.startsWith("/resource/")) return "Resource";
  if (pathname.startsWith("/tanbun/")) return "Tanbun";
  if (pathname === "/user/edit") return "アカウント設定";
  if (pathname.startsWith("/user/")) return "プロフィール";
  return "Tanbunism";
}

function isQuizSection(pathname: string): boolean {
  return pathname === "/quiz";
}
