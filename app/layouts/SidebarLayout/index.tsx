import { useCallback, useState } from "react";
import { Outlet, useMatch, useRevalidator } from "react-router";
import { useSWRConfig } from "swr";
import { useAuth } from "~/features/auth/AuthProvider";
import GlobalHotkeys, {
  HotkeyProvider,
} from "~/features/hotkeys/GlobalHotkeys";
import {
  NotificationProvider,
  useNotifications,
} from "~/features/notifications/NotificationProvider";
import { PushPermissionPrompt } from "~/features/notifications/PushPermissionPrompt";
import PullToRefresh from "~/features/pull-to-refresh/PullToRefresh";
import { Toaster } from "~/shared/components/ui/sonner";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import { useIsMobile } from "~/shared/hooks/use-mobile";
import "github-markdown-css/github-markdown.css";
import AppHeader from "./AppHeader";
import DesktopSidebar from "./DesktopSidebar";
import HeaderXpProgress from "./HeaderXpProgress";
import BottomNavigation from "./components/BottomNavigation";

export default function SidebarLayout() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  return (
    <HistoryPanelProvider>
      <NotificationProvider userId={user?.uid}>
        <HotkeyProvider>
          <SidebarShell isMobile={isMobile} />
        </HotkeyProvider>
      </NotificationProvider>
    </HistoryPanelProvider>
  );
}

function SidebarShell({ isMobile }: { isMobile: boolean }) {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const isDocMode = useMatch("/docs/*");
  const docStyle = isDocMode ? "markdown-body p-4 list-md" : "";
  const { mutate } = useSWRConfig();
  const { refreshNotifications } = useNotifications();
  const revalidator = useRevalidator();

  const refreshPage = useCallback(async () => {
    setRefreshVersion((current) => current + 1);
    await Promise.allSettled([
      mutate(() => true),
      refreshNotifications(),
      revalidator.revalidate(),
    ]);
  }, [mutate, refreshNotifications, revalidator]);

  return (
    <div className="flex h-dvh w-full bg-background">
      <DesktopSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <PullToRefresh
          enabled={isMobile}
          className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-background ${docStyle}`}
          onRefresh={refreshPage}
          childrenKey={refreshVersion}
        >
          <Outlet />
        </PullToRefresh>
        <footer className="w-full shrink-0 border-t bg-background md:hidden">
          {user && (
            <div className="flex h-7 items-center justify-center border-b px-2">
              <HeaderXpProgress
                user={user}
                progressClassName="w-[48vw] min-w-28 max-w-56 sm:w-[48vw]"
              />
            </div>
          )}
          <nav className="flex w-full justify-between p-4 py-2">
            <BottomNavigation />
          </nav>
        </footer>
      </div>
      <GlobalHotkeys />
      {isMobile && user && <PushPermissionPrompt />}
      <Toaster
        richColors
        expand
        closeButton
        position={isMobile ? "top-right" : "bottom-right"}
      />
    </div>
  );
}
