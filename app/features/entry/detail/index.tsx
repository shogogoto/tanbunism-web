import {
  FileText,
  Folder,
  GitFork,
  List,
  ListChecks,
  TextInitial,
} from "lucide-react";
import { useEffect } from "react";
import { Link } from "react-router";
import EntryBreadcrumb from "~/features/resource/EntryBreadcrumb";
import Loading from "~/shared/components/Loading";
import { useGetEntryDetailEntryEntryIdGet } from "~/shared/generated/entry/entry";
import type {
  EntryDetail as EntryDetailType,
  MFolder,
  MResource,
  ResourceStats,
} from "~/shared/generated/fastAPI.schemas";
import { useHistory } from "~/shared/history/hooks";

type Props = {
  id: string;
};

export default function EntryDetail({ id }: Props) {
  const { addHistory } = useHistory();
  const {
    data: result,
    error,
    isLoading,
  } = useGetEntryDetailEntryEntryIdGet(id, {
    swr: {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  });

  useEffect(() => {
    if (result?.status === 200) addHistory({ title: result.data.entry.name });
  }, [addHistory, result]);

  if (isLoading) return <Loading />;
  if (error || !result || result.status !== 200) {
    return (
      <div className="p-6 text-muted-foreground">
        Entryを取得できませんでした。
      </div>
    );
  }

  return <EntryDetailView detail={result.data} />;
}

export function EntryDetailView({ detail }: { detail: EntryDetailType }) {
  const children = detail.children ?? [];
  const folders = children.filter(isFolder);
  const resources = children.filter(isResource);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <EntryBreadcrumb
        user={detail.user}
        folders={[...(detail.ancestors ?? []), detail.entry]}
      />

      <header className="mt-3 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {detail.entry.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {folders.length} Entries · {resources.length} Resources
        </p>
      </header>

      {children.length ? (
        <div className="divide-y divide-border/60 border-b border-border/60">
          {children.map((child) =>
            isResource(child) ? (
              <ResourceRow
                key={child.uid}
                resource={child}
                stats={detail.stats?.[normalizeUid(child.uid)]}
              />
            ) : (
              <EntryRow key={child.uid} entry={child} />
            ),
          )}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          このEntryは空です。
        </p>
      )}
    </main>
  );
}

function EntryRow({ entry }: { entry: MFolder }) {
  return (
    <Link
      to={`/entry/${entry.uid}`}
      className="flex min-h-12 items-center gap-3 rounded-sm px-2 py-3 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Folder
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <span className="min-w-0 truncate text-sm font-medium">{entry.name}</span>
      <span className="ml-auto text-xs text-muted-foreground">Entry</span>
    </Link>
  );
}

function ResourceRow({
  resource,
  stats,
}: {
  resource: MResource;
  stats?: ResourceStats;
}) {
  return (
    <div className="flex min-h-14 items-stretch gap-1">
      <Link
        to={`/resource/${resource.uid}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-sm px-2 py-3 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <FileText
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{resource.name}</div>
            {(resource.authors?.length || resource.published) && (
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {[resource.authors?.join(", "), resource.published]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}
          </div>
          {stats && <CompactStats stats={stats} />}
        </div>
      </Link>
      <Link
        to={`/quiz/list?resource=${resource.uid}`}
        className="flex shrink-0 items-center gap-1 rounded-sm px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${resource.name}のクイズ一覧`}
      >
        <ListChecks className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">クイズ</span>
      </Link>
    </div>
  );
}

function CompactStats({ stats }: { stats: ResourceStats }) {
  return (
    <div className="mt-1 flex shrink-0 gap-3 text-xs tabular-nums text-muted-foreground sm:ml-auto sm:mt-0">
      <span className="flex items-center gap-1" title="単文数">
        <List className="size-3.5" aria-hidden="true" />
        {stats.n_sentence}
      </span>
      <span className="flex items-center gap-1" title="用語数">
        <TextInitial className="size-3.5" aria-hidden="true" />
        {stats.n_term}
      </span>
      <span className="flex items-center gap-1" title="関係数">
        <GitFork className="size-3.5" aria-hidden="true" />
        {stats.n_edge}
      </span>
    </div>
  );
}

function isResource(entry: MFolder | MResource): entry is MResource {
  return "authors" in entry || "published" in entry;
}

function isFolder(entry: MFolder | MResource): entry is MFolder {
  return !isResource(entry);
}

function normalizeUid(uid: string) {
  return uid.replaceAll("-", "");
}
