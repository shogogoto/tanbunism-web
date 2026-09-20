import { Link } from "react-router";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";

type Props = {
  user: UserReadPublic;
};

export default function UserHeader({ user }: Props) {
  const username = user.username || user.uid;
  return (
    <Link
      to={`/user/${username}`}
      className="inline-flex text-xs text-muted-foreground !text-muted-foreground hover:underline"
      title={user.display_name || username}
    >
      @{username}
    </Link>
  );
}
