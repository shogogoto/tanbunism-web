import { File, Folder, Link2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import Loading from "~/shared/components/Loading";
import { TreeView } from "~/shared/components/tree-view";
import { Button } from "~/shared/components/ui/button";
import type { useGetNamaspaceNamespaceGet } from "~/shared/generated/entry/entry";
import type {
  _EdgeData as EdgeData,
  Entry,
  MResource,
  NameSpace,
} from "~/shared/generated/fastAPI.schemas";
import EntryDeleteButton from "./DeleteButton";
import { TileView } from "./TileView";
import ViewSwitcher from "./ViewSwitcher";
import type { ExplorerTreeDataItem } from "./types";

type Props = {
  updater?: () => void;
  nsprops: ReturnType<typeof useGetNamaspaceNamespaceGet>;
};

export default function NamespaceExplorer({ updater, nsprops }: Props) {
  const { data: fetchedData, error, isLoading, mutate } = nsprops;
  const data = fetchedData?.data;
  const [viewMode, setViewMode] = useState<"list" | "tile">("list");

  if (isLoading) return <Loading type="center-x" />;
  if (error) return <div>Error fetching data.</div>;
  if (!data) return <div>no entries.</div>;

  function batchMutate() {
    mutate();
    updater?.();
  }

  const treeData = transformToTreeData(data, batchMutate);
  function renderTreeContent(item: ExplorerTreeDataItem) {
    return (
      <div onKeyUp={item.onClick} key={item.id}>
        <span className="text-sm truncate">{item.name}</span>
        <div className="ml-2 flex-shrink-0 text-xs text-gray-500">
          {item.authors && item.authors.length > 0 && (
            <span>{item.authors.join(", ")}</span>
          )}
          {item.published && <span className="ml-2">{item.published}</span>}
          {item.content_size !== undefined && (
            <span className="ml-2">
              {data?.stats?.[item.id.replaceAll("-", "")].n_sentence} words
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ViewSwitcher mode={viewMode} setMode={setViewMode} />
      </div>
      {viewMode === "list" ? (
        <TreeView
          data={treeData}
          defaultNodeIcon={Folder}
          defaultLeafIcon={File}
          expandAll
          className="h-full"
          renderContent={renderTreeContent}
        />
      ) : (
        <TileView items={treeData} mutate={mutate} />
      )}
    </div>
  );
}
function isResourceNode(node: Entry | MResource): node is MResource {
  return "authors" in node && "published" in node;
}

function transformToTreeData(
  data: NameSpace,
  mutate: () => void,
): ExplorerTreeDataItem[] {
  const nodesMap = new Map<string, ExplorerTreeDataItem>();
  const rootNodes: ExplorerTreeDataItem[] = [];

  if (!data.g?.nodes) return [];

  // biome-ignore lint/suspicious/noExplicitAny: The actual type from the API seems to be { id: Entry | MResource }
  data.g.nodes.forEach((graphNode: any) => {
    const entryData = graphNode.id;
    const commonData = {
      id: entryData.uid,
      name: entryData.name,
    };

    const actions: React.ReactNode[] = [];

    if (isResourceNode(entryData)) {
      actions.push(
        <Button variant="ghost" asChild>
          <Link to={`/resource/${entryData.uid}`}>
            <Link2 />
          </Link>
        </Button>,
      );
      actions.push(
        <EntryDeleteButton
          entryId={entryData.uid}
          name={entryData.name}
          refresh={mutate}
        />,
      );
      nodesMap.set(entryData.uid, {
        ...commonData,
        authors: entryData.authors,
        published: entryData.published,
        content_size: data.stats?.[entryData.uid],
        actions: <>{actions}</>,
      });
    } else {
      // フォルダの場合、後でchildrenが空かどうかを判断するために仮のchildren配列を持たせる
      nodesMap.set(entryData.uid, {
        ...commonData,
        children: [],
        actions: <>{actions}</>, // 初期状態ではゴミ箱ボタンなし
      });
    }
  });

  if (!data.g.edges) {
    // エッジがない場合、すべてのノードがルートノード
    // この時点でフォルダのchildrenが空なので、ゴミ箱ボタンを追加
    nodesMap.forEach((node) => {
      if (
        // @ts-ignore
        !isResourceNode(node) &&
        node.children &&
        node.children.length === 0
      ) {
        node.actions = (
          <>
            {node.actions}
            <EntryDeleteButton
              entryId={node.id}
              name={node.name}
              refresh={mutate}
            />
          </>
        );
      }
      rootNodes.push(node);
    });
    return rootNodes;
  }

  const childUids = new Set<string>();

  data.g.edges.forEach((edge: EdgeData) => {
    // @ts-ignore
    const sourceNode = nodesMap.get(edge.source.uid);
    // @ts-ignore
    const targetNode = nodesMap.get(edge.target.uid);

    if (sourceNode && targetNode && sourceNode.children) {
      sourceNode.children.push(targetNode);
      childUids.add(targetNode.id);
    }
  });

  nodesMap.forEach((node) => {
    if (!childUids.has(node.id)) {
      rootNodes.push(node);
    }
    // @ts-ignore
    if (!isResourceNode(node) && node.children && node.children.length === 0) {
      node.actions = (
        <>
          {node.actions}
          <EntryDeleteButton
            entryId={node.id}
            name={node.name}
            refresh={mutate}
          />
        </>
      );
    }
  });

  return rootNodes;
}
