import { type ComponentProps, memo } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/shared/components/ui/avatar";
import { useAvatarImage } from "../libs/useAvatarImage";
import type { UserProps } from "../types";

type Props = UserProps & ComponentProps<typeof Avatar>;

const UserAvatar = memo(function UserAvatar({ user, ...props }: Props) {
  const image = useAvatarImage(user?.avatar_url, 256, 256);
  return (
    <Avatar {...props}>
      <AvatarImage
        src={image.src}
        onLoadingStatusChange={(status) => {
          if (status === "error") image.onError();
        }}
        alt={user?.display_name || undefined}
      />
      <AvatarFallback>{user?.display_name?.charAt(0) || "N"}</AvatarFallback>
    </Avatar>
  );
});
export default UserAvatar;
