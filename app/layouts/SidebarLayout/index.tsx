import { useState } from "react";
import { Outlet, useMatch } from "react-router";
import { Toaster } from "~/shared/components/ui/sonner";
import { useIsMobile } from "~/shared/hooks/use-mobile";
import "github-markdown-css/github-markdown.css";
import AppHeader from "./AppHeader";
import MobileMenu from "./MobileMenu";
import BottomNavigation from "./components/BottomNavigation";

export default function SidebarLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const isDocMode = useMatch("/docs/*");
  const docStyle = isDocMode ? "markdown-body p-4 list-md" : "";
  return (
    <div className="flex h-dvh w-full flex-col bg-background">
      <AppHeader />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
      <main
        className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-background ${docStyle}`}
      >
        <Outlet />
      </main>
      <footer className="w-full shrink-0 border-t bg-background md:hidden">
        <nav className="flex w-full justify-between p-4 py-2">
          <BottomNavigation onMenuOpen={() => setMenuOpen(true)} />
        </nav>
      </footer>
      <Toaster
        richColors
        expand
        closeButton
        position={isMobile ? "top-right" : "bottom-right"}
      />
    </div>
  );
}
