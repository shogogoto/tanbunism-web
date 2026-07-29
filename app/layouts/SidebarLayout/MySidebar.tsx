import { LogIn, MailQuestion } from "lucide-react";
import { useAuth } from "~/features/auth/AuthProvider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
} from "~/shared/components/ui/sidebar";
import {
  DocsSideMenu,
  FeaturesMenu,
  LearningMenu,
  RankingSideMenu,
  SearchSideMenu,
} from "./SpecificSideMenu";
import UserNavi from "./UserNavi";
import LogoSideMenu from "./components/LogoSideMenu";
import SideMenu from "./components/Sidemenu";

export default function MySidebar() {
  const { user, isAuthenticated } = useAuth();

  const forGuest = (
    <>
      <SideMenu icon={<MailQuestion />} to={"/register"} title="新規登録" />
      <SideMenu icon={<LogIn />} to={"/login"} title="ログイン" />
    </>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border">
        <LogoSideMenu />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!isAuthenticated && forGuest}
          <SidebarMenu>
            <DocsSideMenu />
            <SearchSideMenu />
            <RankingSideMenu />
            {isAuthenticated && <LearningMenu />}
            <FeaturesMenu />
          </SidebarMenu>
          <SideMenu
            icon={<MailQuestion />}
            to={"/contact"}
            title="問い合わせ"
          />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border">
        <UserNavi user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
