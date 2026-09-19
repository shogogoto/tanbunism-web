import { Outlet, useMatch } from "react-router";
import { SidebarProvider } from "~/shared/components/ui/sidebar";
import { Toaster } from "~/shared/components/ui/sonner";
import { useIsMobile } from "~/shared/hooks/use-mobile";
import "github-markdown-css/github-markdown.css";
import MySidebar from "./MySidebar";
import BottomNavigation from "./components/BottomNavigation";

export default function SidebarLayout() {
  const isMobile = useIsMobile();
  const isDocMode = useMatch("/docs/*");
  const docStyle = isDocMode ? "markdown-body p-4 list-md" : "";
  return (
    <SidebarProvider>
      <MySidebar />
      <div className={"flex flex-col w-full h-dvh  bg-white dark:bg-gray-950"}>
        <main className={`flex-1 overflow-y-auto ${docStyle}`}>
          <Outlet />
        </main>
        <footer className="sm:hidden sticky bottom-0 left-0 w-full border-t bg-white dark:bg-gray-950">
          <nav className="flex w-full p-4 py-2 justify-between">
            <BottomNavigation />
          </nav>
        </footer>
      </div>
      <Toaster
        richColors
        expand
        closeButton
        position={isMobile ? "top-right" : "bottom-right"}
      />
    </SidebarProvider>
  );
}
