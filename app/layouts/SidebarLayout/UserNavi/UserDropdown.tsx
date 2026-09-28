import { DialogTrigger } from "@radix-ui/react-dialog";
import { LogOut, Settings, UserRound } from "lucide-react";

import { Link } from "react-router";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/shared/components/ui/dropdown-menu";

type Props = {
  side?: "left" | "right" | "top" | "bottom";
  userId?: string;
};

export default function UserDropdown({ side, userId }: Props) {
  return (
    <DropdownMenuContent
      side={side}
      className="min-w-48 rounded-lg"
      align="end"
      sideOffset={4}
    >
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        {userId && (
          <DropdownMenuItem asChild>
            <Link to={`/user/${userId}`}>
              <UserRound />
              プロフィール
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/user/edit">
            <Settings />
            アカウント設定
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DialogTrigger asChild>
          <DropdownMenuItem>
            <LogOut />
            ログアウト
          </DropdownMenuItem>
        </DialogTrigger>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  );
}
