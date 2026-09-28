import { Link } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import ThemeToggle from "~/shared/components/theme/ThemeToggle";
import { Button } from "~/shared/components/ui/button";
import { HistoryPanel } from "~/shared/history/HistoryPanel";
import UserNavi from "./UserNavi";
import { SiteLogo } from "./components/SiteLogo";

export default function AppHeader() {
  const { user, isAuthenticated } = useAuth();

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

        <span className="hidden text-sm font-medium text-muted-foreground md:block">
          Tanbunism
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
