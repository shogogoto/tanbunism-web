import { ChevronRight, FileText, Folder, ListChecks } from "lucide-react";
import { Link } from "react-router";
import Loading from "~/shared/components/Loading";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/shared/components/ui/collapsible";
import type { useGetNamaspaceNamespaceGet } from "~/shared/generated/entry/entry";
import type {
  Entry,
  MResource,
  NameSpace,
} from "~/shared/generated/fastAPI.schemas";
import EntryDeleteButton from "./DeleteButton";
import type { ExplorerTreeDataItem } from "./types";

type Props = {
  updater?: () => void;
  nsprops: ReturnType<typeof useGetNamaspaceNamespaceGet>;
};

export default function NamespaceExplorer({ updater, nsprops }: Props) {
  const { data: fetchedData, error, isLoading, mutate } = nsprops;
  const data = fetchedData?.data;

  if (isLoading) return <Loading type="center-x" />;
  if (error) return <div>読書メモを取得できませんでした。</div>;
  if (!data) return <div>読書メモはありません。</div>;

  function refresh() {
    mutate();
    updater?.();
  }

  return (
    <div className="divide-y divide-border/60 border-y border-border/60">
      {transformToTreeData(data).map((item) => (
        <NamespaceItem item={item} key={item.id} refresh={refresh} />
      ))}
    </div>
  );
}

function NamespaceItem({
  item,
  refresh,
}: {
  item: ExplorerTreeDataItem;
  refresh: () => void;
}) {
  if (item.isResource) {
    return <ResourceRow item={item} refresh={refresh} />;
  }

  const hasChildren = Boolean(item.children?.length);

  return (
    <Collapsible defaultOpen>
      <div className="flex min-h-11 items-center gap-1">
        <CollapsibleTrigger
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-accent/60"
          disabled={!hasChildren}
        >
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90 ${
              hasChildren ? "" : "invisible"
            }`}
          />
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{item.name}</span>
          <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
            {item.resourceCount} Resources
          </span>
        </CollapsibleTrigger>
        {!hasChildren && (
          <EntryDeleteButton
            entryId={item.id}
            name={item.name}
            refresh={refresh}
          />
        )}
      </div>
      {hasChildren && (
        <CollapsibleContent className="ml-4 border-l border-border/60 pl-2">
          {item.children?.map((child) => (
            <NamespaceItem item={child} key={child.id} refresh={refresh} />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

function ResourceRow({
  item,
  refresh,
}: {
  item: ExplorerTreeDataItem;
  refresh: () => void;
}) {
  return (
    <div className="flex min-h-12 items-stretch gap-1">
      <Link
        to={`/resource/${item.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-2 py-2 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-sm font-medium">{item.name}</span>
            {item.authors && item.authors.length > 0 && (
              <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
                {item.authors.join(", ")}
              </span>
            )}
            {item.published && (
              <span className="hidden shrink-0 text-xs text-muted-foreground lg:inline">
                {item.published}
              </span>
            )}
          </div>
          {item.stats && (
            <div className="mt-0.5 flex shrink-0 gap-2 text-xs tabular-nums text-muted-foreground sm:ml-auto sm:mt-0">
              <span aria-label={`単文数 ${item.stats.n_sentence}`}>
                {item.stats.n_sentence}文
              </span>
              <span aria-label={`用語数 ${item.stats.n_term}`}>
                {item.stats.n_term}語
              </span>
              <span aria-label={`関係数 ${item.stats.n_edge}`}>
                {item.stats.n_edge}関係
              </span>
            </div>
          )}
        </div>
      </Link>
      <Link
        to={`/quiz/list?resource=${item.id}`}
        className="flex shrink-0 items-center gap-1 rounded-sm px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${item.name}のクイズ一覧`}
      >
        <ListChecks className="h-4 w-4" />
        <span className="hidden sm:inline">クイズ</span>
      </Link>
      <EntryDeleteButton entryId={item.id} name={item.name} refresh={refresh} />
    </div>
  );
}

function isResourceNode(node: Entry | MResource): node is MResource {
  return "authors" in node && "published" in node;
}

function normalizeUid(uid: string) {
  return uid.replaceAll("-", "");
}

function edgeUid(endpoint: unknown): string | undefined {
  if (typeof endpoint === "string") return endpoint;
  if (
    endpoint &&
    typeof endpoint === "object" &&
    "uid" in endpoint &&
    typeof endpoint.uid === "string"
  ) {
    return endpoint.uid;
  }
  return undefined;
}

export function transformToTreeData(data: NameSpace): ExplorerTreeDataItem[] {
  const nodesMap = new Map<string, ExplorerTreeDataItem>();
  const rootNodes: ExplorerTreeDataItem[] = [];

  for (const graphNode of data.g?.nodes ?? []) {
    const entryData = graphNode.id as unknown as Entry | MResource;
    if (!entryData?.uid) continue;

    if (isResourceNode(entryData)) {
      nodesMap.set(entryData.uid, {
        id: entryData.uid,
        name: entryData.name,
        isResource: true,
        authors: entryData.authors,
        published: entryData.published,
        stats: data.stats?.[normalizeUid(entryData.uid)],
        resourceCount: 1,
      });
    } else {
      nodesMap.set(entryData.uid, {
        id: entryData.uid,
        name: entryData.name,
        isResource: false,
        children: [],
        resourceCount: 0,
      });
    }
  }

  const childUids = new Set<string>();
  for (const edge of data.g?.edges ?? []) {
    const sourceNode = nodesMap.get(edgeUid(edge.source) ?? "");
    const targetNode = nodesMap.get(edgeUid(edge.target) ?? "");
    if (!sourceNode || !targetNode || sourceNode.isResource) continue;

    sourceNode.children?.push(targetNode);
    childUids.add(targetNode.id);
  }

  for (const node of nodesMap.values()) {
    if (!childUids.has(node.id)) rootNodes.push(node);
  }

  for (const root of rootNodes) countResources(root);
  return rootNodes;
}

function countResources(item: ExplorerTreeDataItem): number {
  if (item.isResource) return 1;
  item.resourceCount =
    item.children?.reduce((count, child) => count + countResources(child), 0) ??
    0;
  return item.resourceCount;
}
