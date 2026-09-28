import { Link, useLocation } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import ThemeToggle from "~/shared/components/theme/ThemeToggle";
import { Button } from "~/shared/components/ui/button";
import { HistoryPanel } from "~/shared/history/HistoryPanel";
import UserNavi from "./UserNavi";
import { SiteLogo } from "./components/SiteLogo";

export default function AppHeader() {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="z-40 shrink-0 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 md:px-6">
        <Link
          to={isAuthenticated ? "/about" : "/"}
          className="mr-2 flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-label="Tanbun トップ"
        >
          <SiteLogo />
        </Link>

        <span className="text-sm font-medium text-muted-foreground">
          {pageTitle(pathname)}
        </span>

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
    </header>
  );
}

function pageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "ダッシュボード";
  if (pathname === "/quiz/list") return "作成したクイズ";
  if (pathname === "/quiz") return "クイズ";
  if (pathname === "/study-plans") return "学習計画";
  if (pathname === "/answers") return "回答履歴";
  if (pathname === "/achievement") return "学習記録";
  if (pathname.startsWith("/docs")) return "ドキュメント";
  if (pathname.startsWith("/search")) return "検索";
  if (pathname.startsWith("/entry/")) return "Entry";
  if (pathname.startsWith("/resource/")) return "Resource";
  if (pathname.startsWith("/tanbun/")) return "Tanbun";
  return "Tanbunism";
}
