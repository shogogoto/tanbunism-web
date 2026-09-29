import { Link, useLocation } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import DashboardHeaderTabs from "~/features/dashboard/DashboardHeaderTabs";
import QuizHeaderTabs from "~/features/quiz/QuizHeaderTabs";
import SearchHeaderControls from "~/features/search/SearchHeaderControls";
import ThemeToggle from "~/shared/components/theme/ThemeToggle";
import { Button } from "~/shared/components/ui/button";
import { HistoryPanel } from "~/shared/history/HistoryPanel";
import UserNavi from "./UserNavi";
import { SiteLogo } from "./components/SiteLogo";

export default function AppHeader() {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const quizSection = isQuizSection(pathname);

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

        <h1 className="absolute left-1/2 max-w-[42vw] -translate-x-1/2 truncate text-sm font-medium text-muted-foreground">
          {pageTitle(pathname)}
        </h1>

        <div className="ml-auto flex items-center gap-1 md:hidden">
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
      {pathname === "/dashboard" && <DashboardHeaderTabs />}
      {quizSection && <QuizHeaderTabs />}
      {pathname.startsWith("/search") && <SearchHeaderControls />}
    </header>
  );
}

function pageTitle(pathname: string): string {
  if (pathname === "/admin") return "管理";
  if (pathname === "/dashboard") return "ダッシュボード";
  if (isQuizSection(pathname)) return "クイズ";
  if (pathname === "/answers") return "回答履歴";
  if (pathname === "/achievement") return "学習記録";
  if (pathname === "/notifications") return "通知";
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
  return ["/quiz", "/quiz/list"].includes(pathname);
}
