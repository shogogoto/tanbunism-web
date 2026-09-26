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
  MFolder,
  MResource,
  UidStr,
  UserReadPublic,
} from "~/shared/generated/fastAPI.schemas";

type FolderCrumb = string | UidStr | MFolder;

type Props = {
  user: UserReadPublic;
  folders?: FolderCrumb[] | null;
  resource?: MResource;
  currentLabel?: string;
  resourceHref?: string;
};

function folderInfo(folder: FolderCrumb) {
  if (typeof folder === "string") return { name: folder };
  return {
    name: "name" in folder ? folder.name : folder.val,
    uid: folder.uid,
  };
}

function breadcrumbFolders(folders: FolderCrumb[]) {
  return folders.reduce<Array<{ key: string; name: string; uid?: string }>>(
    (items, folder) => {
      const { name, uid } = folderInfo(folder);
      const parentKey = items.at(-1)?.key ?? "";
      items.push({
        key: uid ?? `${parentKey}/${name}`,
        name,
        uid,
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
  const folderItems = breadcrumbFolders(folders ?? []);

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
        {folderItems.map(({ key, name, uid }, index) => {
          const isCurrent =
            !resource && !currentLabel && index === folderItems.length - 1;
          return (
            <Fragment key={key}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isCurrent ? (
                  <BreadcrumbPage className="max-w-40 truncate" title={name}>
                    {name}
                  </BreadcrumbPage>
                ) : uid ? (
                  <BreadcrumbLink
                    asChild
                    className="!text-muted-foreground !no-underline"
                  >
                    <Link
                      to={`/entry/${uid}`}
                      className="block max-w-40 truncate"
                      title={name}
                    >
                      {name}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="max-w-40 truncate" title={name}>
                    {name}
                  </span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
        {resource && (
          <>
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
          </>
        )}
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
