import { Link } from "react-router";
import ThemeToggle from "~/shared/components/theme/ThemeToggle";
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/shared/components/ui/sidebar";
import favicon from "/public/favicon.svg?url";

export function SiteLogo() {
  return <img src={favicon} alt="Logo" className="inline size-8" />;
}

export default function LogoSideMenu() {
  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex items-center justify-between">
        <SidebarMenuButton asChild tooltip="Landing Page">
          <Link to="/">
            <SiteLogo />
            <span>Tanbun</span>
          </Link>
        </SidebarMenuButton>
        <SidebarMenuAction asChild>
          <ThemeToggle buttonClassName="border-none" iconClassName="size-4" />
        </SidebarMenuAction>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
