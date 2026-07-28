import { Link } from "react-router";
import UserAvatar from "~/features/user/UserAvatar";
import { HashLink } from "~/shared/components/HashLink";
import type { KnowdeLocation } from "~/shared/generated/fastAPI.schemas";

type Props = {
  loc: KnowdeLocation;
  knowdeId: string;
};

export default function LocationView({ loc, knowdeId }: Props) {
  const { user } = loc;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Link
          to={`/user/${user.username}`}
          className="text-sm text-muted-foreground"
        >
          <UserAvatar user={user} />
        </Link>
        <div className="flex flex-col">
          <div>
            <span className="font-bold">{user.display_name} </span>@
            {user.username || user.uid}
          </div>
          <div className="text-sm text-muted-foreground">
            <HashLink
              to={`/resource/${loc.resource.uid}#${knowdeId}`}
              className="hover:underline space-x-2"
            >
              <span>{loc.resource.name}</span>
              <span>{loc.resource.authors}</span>
              <span>{loc.resource.published}</span>
            </HashLink>
          </div>
        </div>
      </div>
    </div>
  );
}
