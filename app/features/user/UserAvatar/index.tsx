import { type ComponentProps, memo } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/shared/components/ui/avatar";
import { getTransformedImageUrl } from "../libs/image";
import type { UserProps } from "../types";

type Props = UserProps & ComponentProps<typeof Avatar>;

const UserAvatar = memo(function UserAvatar({ user, ...props }: Props) {
  return (
    <Avatar {...props}>
      <AvatarImage
        src={getTransformedImageUrl(user?.avatar_url, 256, 256)}
        alt={user?.display_name || undefined}
      />
      <AvatarFallback>{user?.display_name?.charAt(0) || "N"}</AvatarFallback>
    </Avatar>
  );
});
export default UserAvatar;
