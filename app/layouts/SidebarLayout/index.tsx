import { useState } from "react";
import { Outlet, useMatch } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import GlobalHotkeys, {
  HotkeyProvider,
} from "~/features/hotkeys/GlobalHotkeys";
import { NotificationProvider } from "~/features/notifications/NotificationProvider";
import { Toaster } from "~/shared/components/ui/sonner";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import { useIsMobile } from "~/shared/hooks/use-mobile";
import "github-markdown-css/github-markdown.css";
import AppHeader from "./AppHeader";
import DesktopSidebar from "./DesktopSidebar";
import BottomNavigation from "./components/BottomNavigation";

export default function SidebarLayout() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const isDocMode = useMatch("/docs/*");
  const docStyle = isDocMode ? "markdown-body p-4 list-md" : "";
  return (
    <HistoryPanelProvider>
      <NotificationProvider userId={user?.uid}>
        <HotkeyProvider>
          <div className="flex h-dvh w-full bg-background">
            <DesktopSidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed((current) => !current)}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <AppHeader />
              <main
                className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-background ${docStyle}`}
              >
                <Outlet />
              </main>
              <footer className="w-full shrink-0 border-t bg-background md:hidden">
                <nav className="flex w-full justify-between p-4 py-2">
                  <BottomNavigation />
                </nav>
              </footer>
            </div>
            <GlobalHotkeys />
            <Toaster
              richColors
              expand
              closeButton
              position={isMobile ? "top-right" : "bottom-right"}
            />
          </div>
        </HotkeyProvider>
      </NotificationProvider>
    </HistoryPanelProvider>
  );
}
