import { Fragment } from "react";
import { Link } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/shared/components/ui/breadcrumb";
import type {
  MResource,
  UidStr,
  UserReadPublic,
} from "~/shared/generated/fastAPI.schemas";

type Props = {
  user: UserReadPublic;
  folders?: Array<string | UidStr> | null;
  resource: MResource;
  currentLabel?: string;
  resourceHref?: string;
};

function folderName(folder: string | UidStr) {
  return typeof folder === "string" ? folder : folder.val;
}

function breadcrumbFolders(folders: Array<string | UidStr>) {
  return folders.reduce<Array<{ key: string; name: string }>>(
    (items, folder) => {
      const name = folderName(folder);
      const parentKey = items.at(-1)?.key ?? "";
      items.push({
        key: typeof folder === "string" ? `${parentKey}/${name}` : folder.uid,
        name,
      });
      return items;
    },
    [],
  );
}

export default function EntryBreadcrumb({
  user,
  folders,
  resource,
  currentLabel,
  resourceHref,
}: Props) {
  const username = user.username || user.uid;

  return (
    <Breadcrumb className="overflow-x-auto pb-2" aria-label="保存場所">
      <BreadcrumbList className="!m-0 min-w-max flex-nowrap !list-none !p-0">
        <BreadcrumbItem>
          <BreadcrumbLink
            asChild
            className="!text-muted-foreground !no-underline"
          >
            <Link
              to={`/user/${username}`}
              title={user.display_name || username}
            >
              @{username}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbFolders(folders ?? []).map(({ key, name }) => {
          return (
            <Fragment key={key}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <span className="max-w-40 truncate" title={name}>
                  {name}
                </span>
              </BreadcrumbItem>
            </Fragment>
          );
        })}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {currentLabel ? (
            <BreadcrumbLink
              asChild
              className="!text-muted-foreground !no-underline"
            >
              <Link
                to={resourceHref ?? `/resource/${resource.uid}`}
                className="block max-w-56 truncate"
                title={resource.name}
              >
                {resource.name}
              </Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage
              className="block max-w-56 truncate"
              title={resource.name}
            >
              {resource.name}
            </BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {currentLabel && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage
                className="block max-w-56 truncate"
                title={currentLabel}
              >
                {currentLabel}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
