import { LoaderCircle, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Highlight } from "~/features/tanbun/components/Highlight";
import UserAvatar from "~/features/user/UserAvatar";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent, CardFooter } from "~/shared/components/ui/card";
import { Input } from "~/shared/components/ui/input";
import { searchResourcePostResourceSearchPost } from "~/shared/generated/entry/entry";
import type {
  ResourceInfo,
  ResourceSearchResult,
  Tanbun,
  TanbunSearchResult,
  UserSearchResult,
  UserSearchRow,
} from "~/shared/generated/fastAPI.schemas";
import { SearchByTextTanbunGetType } from "~/shared/generated/fastAPI.schemas";
import { searchUserUserSearchPost } from "~/shared/generated/public-user/public-user";
import { searchByTextTanbunGet } from "~/shared/generated/tanbun/tanbun";
import { useDebounce } from "~/shared/hooks/useDebounce";

const PAGE_SIZE = 20;
const searchTypes = ["knowledge", "resource", "user"] as const;
type SearchType = (typeof searchTypes)[number];

type SearchState = {
  knowledge: Tanbun[];
  resources: ResourceInfo[];
  users: UserSearchRow[];
  resourceInfos: TanbunSearchResult["resource_infos"];
  totals: Record<SearchType, number>;
};

const emptyState = (): SearchState => ({
  knowledge: [],
  resources: [],
  users: [],
  resourceInfos: {},
  totals: { knowledge: 0, resource: 0, user: 0 },
});

export default function UnifiedSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const typesParam = searchParams.get("types");
  const enabledTypes = useMemo(
    () => parseSearchTypes(typesParam),
    [typesParam],
  );
  const enabledKey = enabledTypes.join(",");
  const debouncedQuery = useDebounce(query, 400);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<SearchState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const previousSearchRef = useRef("");
  const lastRequestRef = useRef("");

  const searchKey = `${debouncedQuery}:${enabledKey}`;

  useEffect(() => {
    const reset = previousSearchRef.current !== searchKey;
    const requestedPage = reset ? 1 : page;
    const requestKey = `${searchKey}:${requestedPage}`;
    if (lastRequestRef.current === requestKey) return;

    previousSearchRef.current = searchKey;
    lastRequestRef.current = requestKey;
    if (reset) {
      setPage(1);
      setState(emptyState());
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(undefined);

    searchAll(debouncedQuery, enabledTypes, requestedPage, controller.signal)
      .then((next) => {
        setState((current) => mergeSearchState(current, next, reset));
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "検索結果を取得できませんでした。",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, enabledTypes, page, searchKey]);

  const hasMore = enabledTypes.some((type) => {
    const count =
      type === "knowledge"
        ? state.knowledge.length
        : type === "resource"
          ? state.resources.length
          : state.users.length;
    return count < state.totals[type];
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPage((current) => current + 1);
      },
      { rootMargin: "320px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  const mixedResults = useMemo(
    () => mixResults(state, enabledTypes),
    [state, enabledTypes],
  );
  const total = enabledTypes.reduce((sum, type) => sum + state.totals[type], 0);

  function setQuery(value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set("q", value);
      else next.delete("q");
      return next;
    });
  }

  function toggleType(type: SearchType) {
    const nextTypes = enabledTypes.includes(type)
      ? enabledTypes.filter((item) => item !== type)
      : [...enabledTypes, type];
    if (nextTypes.length === 0) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextTypes.length === searchTypes.length) next.delete("types");
      else next.set("types", nextTypes.join(","));
      return next;
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
      <header className="sticky top-0 z-10 space-y-3 border-b bg-background/95 py-4 backdrop-blur">
        <div className="relative">
          {isLoading ? (
            <LoaderCircle className="absolute left-3 top-2.5 size-5 animate-spin text-muted-foreground" />
          ) : (
            <Search className="absolute left-3 top-2.5 size-5 text-muted-foreground" />
          )}
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="知識、リソース、ユーザーを検索"
            aria-label="検索"
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2" aria-label="検索対象">
          {searchTypes.map((type) => (
            <Button
              key={type}
              type="button"
              size="sm"
              variant="outline"
              className={
                searchTypeButtonStyles[type][
                  enabledTypes.includes(type) ? "selected" : "unselected"
                ]
              }
              aria-pressed={enabledTypes.includes(type)}
              onClick={() => toggleType(type)}
            >
              {searchTypeLabels[type]}
            </Button>
          ))}
        </div>
      </header>

      <div className="py-4">
        <p className="text-sm text-muted-foreground">
          {isLoading && mixedResults.length === 0
            ? "検索しています…"
            : `${total}件の検索結果`}
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {mixedResults.map((result) => {
          if (result.type === "knowledge") {
            return (
              <KnowledgeResult
                key={`knowledge:${result.value.uid}`}
                value={result.value}
                info={state.resourceInfos[result.value.resource_uid]}
                query={debouncedQuery}
              />
            );
          }
          if (result.type === "resource") {
            return (
              <ResourceResult
                key={`resource:${result.value.resource.uid}`}
                value={result.value}
                query={debouncedQuery}
              />
            );
          }
          return (
            <UserResult
              key={`user:${result.value.user.uid}`}
              value={result.value}
              query={debouncedQuery}
            />
          );
        })}
      </div>

      {!isLoading && mixedResults.length === 0 && !error && (
        <p className="py-12 text-center text-muted-foreground">
          検索結果はありません
        </p>
      )}

      <div
        ref={sentinelRef}
        className="flex min-h-16 items-center justify-center"
      >
        {isLoading && mixedResults.length > 0 && (
          <LoaderCircle
            className="size-5 animate-spin text-muted-foreground"
            aria-label="続きを読み込んでいます"
          />
        )}
        {!isLoading && !hasMore && mixedResults.length > 0 && (
          <span className="text-sm text-muted-foreground">
            すべて表示しました
          </span>
        )}
      </div>
    </div>
  );
}

type MixedResult =
  | { type: "knowledge"; value: Tanbun }
  | { type: "resource"; value: ResourceInfo }
  | { type: "user"; value: UserSearchRow };

function mixResults(state: SearchState, enabled: SearchType[]): MixedResult[] {
  const rows: Record<SearchType, MixedResult[]> = {
    knowledge: state.knowledge.map((value) => ({ type: "knowledge", value })),
    resource: state.resources.map((value) => ({ type: "resource", value })),
    user: state.users.map((value) => ({ type: "user", value })),
  };
  const maxLength = Math.max(0, ...enabled.map((type) => rows[type].length));
  return Array.from({ length: maxLength }, (_, index) =>
    enabled.flatMap((type) => rows[type][index] ?? []),
  ).flat();
}

async function searchAll(
  query: string,
  enabled: SearchType[],
  page: number,
  signal: AbortSignal,
): Promise<SearchState> {
  const next = emptyState();
  await Promise.all(
    enabled.map(async (type) => {
      if (type === "knowledge") {
        const response = await searchByTextTanbunGet(
          {
            q: query,
            type: SearchByTextTanbunGetType.CONTAINS,
            page,
            size: PAGE_SIZE,
          },
          { signal },
        );
        if (response.status !== 200)
          throw new Error("知識を検索できませんでした。");
        const result = response.data as TanbunSearchResult;
        next.knowledge = result.data;
        next.resourceInfos = result.resource_infos;
        next.totals.knowledge = result.total;
        return;
      }
      if (type === "resource") {
        const response = await searchResourcePostResourceSearchPost(
          {
            q: query,
            paging: { page, size: PAGE_SIZE },
            desc: true,
            order_by: ["title"],
          },
          { signal },
        );
        if (response.status !== 200)
          throw new Error("リソースを検索できませんでした。");
        const result = response.data as ResourceSearchResult;
        next.resources = result.data ?? [];
        next.totals.resource = result.total;
        return;
      }
      const response = await searchUserUserSearchPost(
        {
          q: query,
          paging: { page, size: PAGE_SIZE },
          desc: true,
          order_by: ["username"],
        },
        { signal },
      );
      if (response.status !== 200)
        throw new Error("ユーザーを検索できませんでした。");
      const result = response.data as UserSearchResult;
      next.users = result.data;
      next.totals.user = result.total;
    }),
  );
  return next;
}

function mergeSearchState(
  current: SearchState,
  next: SearchState,
  replace: boolean,
): SearchState {
  if (replace) return next;
  return {
    knowledge: [...current.knowledge, ...next.knowledge],
    resources: [...current.resources, ...next.resources],
    users: [...current.users, ...next.users],
    resourceInfos: { ...current.resourceInfos, ...next.resourceInfos },
    totals: {
      knowledge: next.totals.knowledge || current.totals.knowledge,
      resource: next.totals.resource || current.totals.resource,
      user: next.totals.user || current.totals.user,
    },
  };
}

function parseSearchTypes(value: string | null): SearchType[] {
  if (!value) return [...searchTypes];
  const parsed = value
    .split(",")
    .filter((type): type is SearchType =>
      searchTypes.includes(type as SearchType),
    );
  return parsed.length > 0 ? parsed : [...searchTypes];
}

const searchTypeLabels: Record<SearchType, string> = {
  knowledge: "知識",
  resource: "リソース",
  user: "ユーザー",
};

const searchTypeButtonStyles: Record<
  SearchType,
  { selected: string; unselected: string }
> = {
  knowledge: {
    selected: "border-blue-600 bg-blue-600 text-white hover:bg-blue-700",
    unselected:
      "border-blue-500/60 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950",
  },
  resource: {
    selected: "border-orange-600 bg-orange-600 text-white hover:bg-orange-700",
    unselected:
      "border-orange-500/60 text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950",
  },
  user: {
    selected: "border-purple-600 bg-purple-600 text-white hover:bg-purple-700",
    unselected:
      "border-purple-500/60 text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950",
  },
};

function KnowledgeResult({
  value,
  info,
  query,
}: {
  value: Tanbun;
  info?: ResourceInfo;
  query: string;
}) {
  return (
    <Link to={`/tanbun/${value.uid}`} state={{ tanbun: value, ...info }}>
      <Card className="border-l-4 border-l-blue-500 hover:bg-muted/40">
        <CardContent className="space-y-2">
          <span className="sr-only">知識:</span>
          {value.term?.names?.length ? (
            <p className="font-semibold">
              {value.term.names.map((name) => (
                <span key={name} className="mr-2">
                  <Highlight text={name} query={query} />
                </span>
              ))}
            </p>
          ) : null}
          {value.sentence !== "<<<not defined>>>" && (
            <p className="break-words">
              <Highlight text={value.sentence} query={query} />
            </p>
          )}
          {info?.resource && (
            <p className="text-sm text-muted-foreground">
              {info.resource.name}
            </p>
          )}
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          重要度 {Math.round(value.stats.score ?? 0)}
        </CardFooter>
      </Card>
    </Link>
  );
}

function ResourceResult({
  value,
  query,
}: { value: ResourceInfo; query: string }) {
  const { resource, user } = value;
  return (
    <Link to={`/resource/${resource.uid}`}>
      <Card className="border-l-4 border-l-orange-500 hover:bg-muted/40">
        <CardContent className="space-y-2">
          <span className="sr-only">リソース:</span>
          <p className="font-semibold text-lg">
            <Highlight text={resource.name} query={query} />
          </p>
          {resource.authors?.length ? (
            <p className="text-sm text-muted-foreground">
              {resource.authors.join(", ")}
            </p>
          ) : null}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserAvatar user={user} className="size-5" />
            <span>{user.display_name || user.username}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function UserResult({ value, query }: { value: UserSearchRow; query: string }) {
  const { user } = value;
  return (
    <Link to={`/user/${user.username || user.uid}`}>
      <Card className="border-l-4 border-l-purple-500 hover:bg-muted/40">
        <CardContent className="flex gap-3">
          <span className="sr-only">ユーザー:</span>
          <UserAvatar user={user} />
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">
              <Highlight
                text={user.display_name || user.username || "名前未設定"}
                query={query}
              />
            </p>
            {user.username && (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            )}
            {user.profile && (
              <p className="line-clamp-2 text-sm">{user.profile}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
