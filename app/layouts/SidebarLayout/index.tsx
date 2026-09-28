import { useState } from "react";
import { Outlet, useMatch } from "react-router";
import { Toaster } from "~/shared/components/ui/sonner";
import { useIsMobile } from "~/shared/hooks/use-mobile";
import "github-markdown-css/github-markdown.css";
import AppHeader from "./AppHeader";
import DesktopSidebar from "./DesktopSidebar";
import BottomNavigation from "./components/BottomNavigation";

export default function SidebarLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const isLandingPage = useMatch("/");
  const isDocMode = useMatch("/docs/*");
  const docStyle = isDocMode ? "markdown-body p-4 list-md" : "";
  return (
    <div className="flex h-dvh w-full bg-background">
      {!isLandingPage && (
        <DesktopSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {!isLandingPage && <AppHeader />}
        <main
          className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-background ${docStyle}`}
        >
          <Outlet />
        </main>
        {!isLandingPage && (
          <footer className="w-full shrink-0 border-t bg-background md:hidden">
            <nav className="flex w-full justify-between p-4 py-2">
              <BottomNavigation />
            </nav>
          </footer>
        )}
      </div>
      <Toaster
        richColors
        expand
        closeButton
        position={isMobile ? "top-right" : "bottom-right"}
      />
    </div>
  );
}
