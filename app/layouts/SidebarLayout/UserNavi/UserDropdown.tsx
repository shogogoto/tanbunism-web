import { DialogTrigger } from "@radix-ui/react-dialog";
import { LogOut, Settings } from "lucide-react";

import { Link } from "react-router";
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/shared/components/ui/dropdown-menu";

type Props = {
  side?: "left" | "right" | "top" | "bottom";
};

export default function UserDropdown({ side }: Props) {
  return (
    <DropdownMenuContent
      side={side}
      className="min-w-48 rounded-lg"
      align="end"
      sideOffset={4}
    >
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
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
