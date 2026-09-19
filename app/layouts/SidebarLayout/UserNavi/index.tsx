import LogoutDialogContent from "~/features/auth/SignOutDialog";
import UserAvatar from "~/features/user/UserAvatar";
import { Button } from "~/shared/components/ui/button";
import { Dialog } from "~/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "~/shared/components/ui/dropdown-menu";
import type { UserRead } from "~/shared/generated/fastAPI.schemas";
import UserDropdown from "./UserDropdown";

type Props = {
  user: UserRead | undefined;
  side?: "left" | "right" | "top" | "bottom";
};

export default function UserNavi({ user, side = "bottom" }: Props) {
  return (
    <Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="ユーザーメニュー"
            className="rounded-full"
          >
            <UserAvatar user={user} />
          </Button>
        </DropdownMenuTrigger>
        <UserDropdown side={side} />
      </DropdownMenu>
      <LogoutDialogContent />
    </Dialog>
  );
}
