import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import UserAvatar from "../../UserAvatar";
import { getTransformedImageUrl } from "../../libs/image";
import type { UserProps } from "../../types";

type Props = UserProps & {
  disableDialog?: boolean;
};

export default function ProfileImage({ user, disableDialog = false }: Props) {
  if (!user?.avatar_url || disableDialog)
    return <UserAvatar user={user} className="size-24" />;

  return (
    <Dialog>
      <DialogTrigger asChild disabled={!user?.avatar_url}>
        <UserAvatar user={user} className="size-24 cursor-pointer" />
      </DialogTrigger>
      <DialogContent className="p-0 border-0 w-full sm:max-w-md md:max-w-lg lg:max-w-xl">
        <img
          src={getTransformedImageUrl(user?.avatar_url, 1024, 1024, "limit")}
          alt={user?.display_name || user?.username || user?.uid}
          className="w-full h-auto rounded-lg"
        />
      </DialogContent>
    </Dialog>
  );
}
