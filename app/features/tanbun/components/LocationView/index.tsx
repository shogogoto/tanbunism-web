import { Link } from "react-router";
import { HashLink } from "~/shared/components/HashLink";
import type { TanbunLocation } from "~/shared/generated/fastAPI.schemas";

type Props = {
  loc: TanbunLocation;
  tanbunId: string;
};

export default function LocationView({ loc, tanbunId }: Props) {
  const { user } = loc;
  const username = user.username || user.uid;
  return (
    <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground">
      <HashLink
        to={`/resource/${loc.resource.uid}#${tanbunId}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 hover:underline"
      >
        <span className="font-medium text-foreground">{loc.resource.name}</span>
        {loc.resource.authors?.length ? (
          <span>{loc.resource.authors.join(", ")}</span>
        ) : null}
        {loc.resource.published && <span>{loc.resource.published}</span>}
      </HashLink>
      <Link
        to={`/user/${username}`}
        className="text-xs text-muted-foreground hover:underline"
        title={user.display_name || username}
      >
        @{username}
      </Link>
    </div>
  );
}
