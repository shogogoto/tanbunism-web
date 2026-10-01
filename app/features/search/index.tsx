import {
  Baseline,
  GitFork,
  List,
  LoaderCircle,
  type LucideIcon,
  TextInitial,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Highlight } from "~/features/tanbun/components/Highlight";
import KnowledgeCard from "~/features/tanbun/components/KnowledgeCard";
import UserAvatar from "~/features/user/UserAvatar";
import { Card, CardContent } from "~/shared/components/ui/card";
import { searchResourcePostResourceSearchPost } from "~/shared/generated/entry/entry";
import type {
  ResourceInfo,
  ResourceSearchResult,
  Tanbun,
  TanbunSearchResult,
  UserSearchResult,
  UserSearchRow,
} from "~/shared/generated/fastAPI.schemas";
import { searchUserUserSearchPost } from "~/shared/generated/public-user/public-user";
import { searchByTextTanbunGet } from "~/shared/generated/tanbun/tanbun";
import { createCacheKey } from "~/shared/hooks/swr/useCache";
import { genericCache } from "~/shared/lib/indexed";
import {
  type SearchSettings,
  type SearchType,
  readSearchSettings,
  searchTypes,
} from "./settings";

const PAGE_SIZE = 20;

type SearchState = {
  knowledge: Tanbun[];
  resources: ResourceInfo[];
  users: UserSearchRow[];
  resourceInfos: TanbunSearchResult["resource_infos"];
  totals: Record<SearchType, number>;
};

type SearchSlice =
  | {
      type: "knowledge";
      data: Tanbun[];
      resourceInfos: TanbunSearchResult["resource_infos"];
      total: number;
    }
  | { type: "resource"; data: ResourceInfo[]; total: number }
  | { type: "user"; data: UserSearchRow[]; total: number };

const emptyState = (): SearchState => ({
  knowledge: [],
  resources: [],
  users: [],
  resourceInfos: {},
  totals: { knowledge: 0, resource: 0, user: 0 },
});

export default function UnifiedSearch() {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") ?? "";
  const typesParam = searchParams.get("types");
  const enabledTypes = useMemo(
    () => parseSearchTypes(typesParam),
    [typesParam],
  );
  const settings = useMemo(
    () => readSearchSettings(searchParams),
    [searchParams],
  );
  const enabledKey = enabledTypes.join(",");
  const settingsKey = JSON.stringify(settings);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<SearchState>(emptyState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const previousSearchRef = useRef("");
  const lastRequestRef = useRef("");

  const searchKey = `${queryParam}:${enabledKey}:${settingsKey}`;

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

    async function load() {
      const errors = await Promise.all(
        enabledTypes.map(async (type) => {
          const cacheKey = searchCacheKey(
            type,
            queryParam,
            requestedPage,
            settings,
          );
          const cached = await getCachedSearchSlice(cacheKey);
          if (controller.signal.aborted) return undefined;
          if (cached) {
            setState((current) =>
              mergeSearchSlice(current, cached, requestedPage > 1),
            );
          }

          try {
            const fresh = await searchType(
              type,
              queryParam,
              requestedPage,
              settings,
              controller.signal,
            );
            if (controller.signal.aborted) return undefined;
            setState((current) =>
              mergeSearchSlice(current, fresh, requestedPage > 1),
            );
            void genericCache.set(cacheKey, fresh).catch(() => undefined);
            return undefined;
          } catch (reason) {
            if (controller.signal.aborted || cached) return undefined;
            return reason instanceof Error
              ? reason.message
              : "検索結果を取得できませんでした。";
          }
        }),
      );
      if (controller.signal.aborted) return;
      const messages = [...new Set(errors.filter((value) => value != null))];
      if (messages.length > 0) setError(messages.join("\n"));
      setIsLoading(false);
    }

    void load();

    return () => controller.abort();
  }, [queryParam, enabledTypes, page, searchKey, settings]);

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

  return (
    <div className="mx-auto min-h-full w-full max-w-3xl bg-background px-2 sm:px-3">
      <div className="py-2">
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

      <div className="divide-y border-y sm:border-x">
        {mixedResults.map((result) => {
          if (result.type === "knowledge") {
            return (
              <KnowledgeResult
                key={`knowledge:${result.value.uid}`}
                value={result.value}
                info={state.resourceInfos[result.value.resource_uid]}
                query={queryParam}
              />
            );
          }
          if (result.type === "resource") {
            return (
              <ResourceResult
                key={`resource:${result.value.resource.uid}`}
                value={result.value}
                query={queryParam}
              />
            );
          }
          return (
            <UserResult
              key={`user:${result.value.user.uid}`}
              value={result.value}
              query={queryParam}
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

async function searchType(
  type: SearchType,
  query: string,
  page: number,
  settings: SearchSettings,
  signal: AbortSignal,
): Promise<SearchSlice> {
  if (type === "knowledge") {
    const response = await searchByTextTanbunGet(
      {
        q: query,
        type: settings.knowledge.matchType,
        page,
        size: PAGE_SIZE,
        n_detail: settings.knowledge.weights.detail,
        n_premise: settings.knowledge.weights.premise,
        n_conclusion: settings.knowledge.weights.conclusion,
        n_refer: settings.knowledge.weights.refer,
        n_referred: settings.knowledge.weights.referred,
        desc: settings.knowledge.desc,
      },
      { signal },
    );
    if (response.status !== 200)
      throw new Error("知識を検索できませんでした。");
    const result = response.data as TanbunSearchResult;
    return {
      type,
      data: result.data,
      resourceInfos: result.resource_infos,
      total: result.total,
    };
  }
  if (type === "resource") {
    const response = await searchResourcePostResourceSearchPost(
      {
        q: query,
        q_user: settings.resource.user,
        paging: { page, size: PAGE_SIZE },
        desc: settings.resource.desc,
        order_by: [settings.resource.order],
      },
      { signal },
    );
    if (response.status !== 200)
      throw new Error("リソースを検索できませんでした。");
    const result = response.data as ResourceSearchResult;
    return { type, data: result.data ?? [], total: result.total };
  }
  const response = await searchUserUserSearchPost(
    {
      q: query,
      paging: { page, size: PAGE_SIZE },
      desc: settings.user.desc,
      order_by: [settings.user.order],
    },
    { signal },
  );
  if (response.status !== 200)
    throw new Error("ユーザーを検索できませんでした。");
  const result = response.data as UserSearchResult;
  return { type, data: result.data, total: result.total };
}

function searchCacheKey(
  type: SearchType,
  query: string,
  page: number,
  settings: SearchSettings,
) {
  return createCacheKey(`unified-search-${type}`, {
    query,
    settings: JSON.stringify(settings[type]),
    page,
  });
}

function mergeSearchSlice(
  current: SearchState,
  slice: SearchSlice,
  append: boolean,
): SearchState {
  if (slice.type === "knowledge") {
    return {
      ...current,
      knowledge: append
        ? mergeUnique(current.knowledge, slice.data, (value) => value.uid)
        : slice.data,
      resourceInfos: append
        ? { ...current.resourceInfos, ...slice.resourceInfos }
        : slice.resourceInfos,
      totals: { ...current.totals, knowledge: slice.total },
    };
  }
  if (slice.type === "resource") {
    return {
      ...current,
      resources: append
        ? mergeUnique(
            current.resources,
            slice.data,
            (value) => value.resource.uid,
          )
        : slice.data,
      totals: { ...current.totals, resource: slice.total },
    };
  }
  return {
    ...current,
    users: append
      ? mergeUnique(current.users, slice.data, (value) => value.user.uid)
      : slice.data,
    totals: { ...current.totals, user: slice.total },
  };
}

function mergeUnique<T>(current: T[], next: T[], getId: (value: T) => string) {
  const merged = new Map(current.map((value) => [getId(value), value]));
  for (const value of next) merged.set(getId(value), value);
  return [...merged.values()];
}

async function getCachedSearchSlice(
  key: string,
): Promise<SearchSlice | undefined> {
  try {
    return (await genericCache.get(key)) as SearchSlice | undefined;
  } catch {
    return undefined;
  }
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
    <KnowledgeCard
      uid={value.uid}
      sentence={value.sentence}
      termNames={value.term?.names}
      score={Math.round(value.stats.score ?? 0)}
      query={query}
      state={{ tanbun: value, ...info }}
      metadata={
        info?.resource ? (
          <Link
            to={`/resource/${info.resource.uid}#${value.uid}`}
            className="truncate hover:text-foreground hover:underline"
          >
            {info.resource.name}
          </Link>
        ) : undefined
      }
      compact
      scorePosition="start"
      hotkeyItem
    />
  );
}

function ResourceResult({
  value,
  query,
}: { value: ResourceInfo; query: string }) {
  const { resource, resource_stats: stats, user } = value;
  return (
    <Link
      to={`/resource/${resource.uid}`}
      data-hotkey-item
      className="block outline-none data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-inset data-[hotkey-active=true]:ring-primary"
    >
      <Card className="gap-0 rounded-none border-0 border-l-2 border-l-orange-500 py-0 shadow-none hover:bg-muted/40">
        <CardContent className="space-y-1.5 p-2">
          <span className="sr-only">リソース:</span>
          <div className="flex min-w-0 items-baseline gap-2 text-sm">
            <p className="min-w-0 truncate font-semibold">
              <Highlight text={resource.name} query={query} />
            </p>
            {resource.authors?.length ? (
              <p className="shrink truncate text-muted-foreground">
                {resource.authors.join(", ")}
              </p>
            ) : null}
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            <ResourceStat Icon={Baseline} label="文字数" value={stats.n_char} />
            <ResourceStat Icon={List} label="単文数" value={stats.n_sentence} />
            <ResourceStat
              Icon={TextInitial}
              label="用語数"
              value={stats.n_term}
            />
            <ResourceStat Icon={GitFork} label="関係数" value={stats.n_edge} />
            <span className="ml-auto flex min-w-0 items-center gap-1.5 text-xs">
              <UserAvatar user={user} className="size-5" />
              <span className="max-w-28 truncate">
                {user.display_name || user.username}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ResourceStat({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: number;
}) {
  return <SearchMetric Icon={Icon} label={label} value={value} tone="orange" />;
}

function SearchMetric({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: LucideIcon;
  label: string;
  value: number;
  tone: "blue" | "orange";
}) {
  const color =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
      : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-300";
  return (
    <span
      className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 ${color}`}
      aria-label={`${label}: ${value}`}
      title={`${label}: ${value}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="font-mono text-xs">{value}</span>
    </span>
  );
}

function UserResult({ value, query }: { value: UserSearchRow; query: string }) {
  const { user } = value;
  return (
    <Link
      to={`/user/${user.username || user.uid}`}
      data-hotkey-item
      className="block outline-none data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-inset data-[hotkey-active=true]:ring-primary"
    >
      <Card className="gap-0 rounded-none border-0 border-l-2 border-l-purple-500 py-0 shadow-none hover:bg-muted/40">
        <CardContent className="flex min-w-0 items-center gap-2 p-2">
          <span className="sr-only">ユーザー:</span>
          <UserAvatar user={user} className="size-8 shrink-0" />
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <p className="shrink-0 font-semibold">
              <Highlight
                text={user.display_name || user.username || "名前未設定"}
                query={query}
              />
            </p>
            {user.username && (
              <span className="shrink-0 text-sm text-muted-foreground">
                @{user.username}
              </span>
            )}
            <span className="shrink-0 text-xs font-medium text-purple-700 dark:text-purple-300">
              Lv. {value.level}
            </span>
            {user.profile && (
              <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {user.profile}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
