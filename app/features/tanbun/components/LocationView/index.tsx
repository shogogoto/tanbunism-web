import { Fragment } from "react";
import EntryBreadcrumb from "~/features/resource/EntryBreadcrumb";
import { HashLink } from "~/shared/components/HashLink";
import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "~/shared/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/shared/components/ui/dropdown-menu";
import type { Tanbun, TanbunContext } from "~/shared/generated/fastAPI.schemas";
import { canonicalSentenceId } from "../../detail/cache";

type Props = {
  loc: TanbunContext;
  tanbunId: string;
  current: Tanbun;
  ariaLabel?: string;
  resourceHref?: string;
};

export default function LocationView({
  loc,
  tanbunId,
  current,
  ariaLabel,
  resourceHref,
}: Props) {
  const ancestors = [
    ...(loc.headers ?? []).map((header) => ({
      uid: header.uid,
      label: header.val,
      to: `/resource/${loc.resource.uid}#${header.uid}`,
      state: undefined,
    })),
    ...(loc.parents ?? []).map((parent) => ({
      uid: parent.uid,
      label:
        parent.sentence === "<<<not defined>>>"
          ? (parent.term?.names?.[0] ?? "名称未設定")
          : parent.sentence,
      to: `/tanbun/${parent.uid}`,
      state: { tanbun: parent, user: loc.user, resource: loc.resource },
    })),
  ].filter(
    (ancestor, index, all) =>
      canonicalSentenceId(ancestor.uid) !== canonicalSentenceId(current.uid) &&
      all.findIndex(
        (item) =>
          canonicalSentenceId(item.uid) === canonicalSentenceId(ancestor.uid),
      ) === index,
  );
  const hidden = ancestors.length > 4 ? ancestors.slice(2, -1) : [];
  const visible = hidden.length
    ? [...ancestors.slice(0, 2), ancestors[ancestors.length - 1]]
    : ancestors;

  return (
    <EntryBreadcrumb
      user={loc.user}
      folders={loc.folders}
      resource={loc.resource}
      resourceHref={resourceHref ?? `/resource/${loc.resource.uid}#${tanbunId}`}
      ariaLabel={ariaLabel}
      wrap
    >
      {visible.map((ancestor, index) => (
        <Fragment key={ancestor.uid}>
          {hidden.length > 0 && index === 2 && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="rounded px-2 py-1 hover:bg-muted"
                    aria-label="省略された親経路を開く"
                  >
                    …
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-w-[min(24rem,90vw)]"
                  >
                    {hidden.map((item) => (
                      <DropdownMenuItem key={item.uid} asChild>
                        <HashLink
                          to={item.to}
                          state={item.state}
                          className="whitespace-normal break-words"
                        >
                          {item.label}
                        </HashLink>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <HashLink
                to={ancestor.to}
                state={ancestor.state}
                title={ancestor.label}
                className="block max-w-48 truncate"
              >
                {ancestor.label}
              </HashLink>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </Fragment>
      ))}
    </EntryBreadcrumb>
  );
}
