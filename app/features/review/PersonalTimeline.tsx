import { Eye } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { useSWRConfig } from "swr";
import KnowledgeCard, {
  KnowledgeScore,
} from "~/features/tanbun/components/KnowledgeCard";
import Loading from "~/shared/components/Loading";
import { Button } from "~/shared/components/ui/button";
import { usePersistentSWR } from "~/shared/hooks/swr/useCache";
import { genericCache } from "~/shared/lib/indexed";
import { useRecommendationDay } from "~/shared/lib/recommendationDay";
import {
  type PersonalTanbunItem,
  getTodayTanbunExposureCount,
  listPersonalTanbuns,
  markTanbunSeen,
} from "./api";

type PersonalTimelineData = {
  items: PersonalTanbunItem[];
  seenTodayCount: number;
};

export const PERSONAL_TIMELINE_CACHE_KEY =
  "private:dashboard:personal-timeline";
const PERSONAL_TIMELINE_CACHE_TTL = 24 * 60 * 60_000;

export default function PersonalTimeline() {
  const { mutate: mutateGlobal } = useSWRConfig();
  const day = useRecommendationDay();
  const cacheKey = `${PERSONAL_TIMELINE_CACHE_KEY}:${day}`;
  const {
    data,
    error: loadError,
    isLoading,
    mutate,
  } = usePersistentSWR<PersonalTimelineData>(
    ["dashboard-personal-timeline", day],
    async () => {
      const [items, today] = await Promise.all([
        listPersonalTanbuns(),
        getTodayTanbunExposureCount(),
      ]);
      return { items, seenTodayCount: today.count };
    },
    {
      cacheKey,
      getCache: async (key) =>
        (await genericCache.get(key)) as PersonalTimelineData | undefined,
      setCache: (key, fresh) =>
        genericCache.set(key, fresh, PERSONAL_TIMELINE_CACHE_TTL),
      swr: {
        dedupingInterval: 30_000,
        keepPreviousData: false,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
      },
    },
  );
  const items = data?.items ?? [];
  const seenTodayCount = data?.seenTodayCount ?? 0;
  const [actionError, setActionError] = useState<string>();
  const pendingExposureIds = useRef(new Set<string>());

  function updateTimeline(
    update: (current: PersonalTimelineData) => PersonalTimelineData,
  ) {
    void mutate(
      (current) => {
        if (!current) return current;
        const next = update(current);
        void genericCache
          .set(cacheKey, next, PERSONAL_TIMELINE_CACHE_TTL)
          .catch(() => undefined);
        return next;
      },
      { revalidate: false },
    );
  }

  async function markSeen(item: PersonalTanbunItem) {
    if (item.seen_today || pendingExposureIds.current.has(item.uid)) return;
    pendingExposureIds.current.add(item.uid);
    setActionError(undefined);
    updateTimeline((current) => ({
      seenTodayCount: current.seenTodayCount + 1,
      items: current.items.map((candidate) =>
        candidate.uid === item.uid
          ? {
              ...candidate,
              seen_today: true,
              exposure_count: candidate.exposure_count + 1,
            }
          : candidate,
      ),
    }));
    try {
      const result = await markTanbunSeen(item.uid);
      const today = await getTodayTanbunExposureCount().catch(() => undefined);
      updateTimeline((current) => ({
        seenTodayCount: today?.count ?? current.seenTodayCount,
        items: current.items.map((candidate) =>
          candidate.uid === item.uid
            ? {
                ...candidate,
                seen_today: true,
                exposure_count: result.exposure_count,
              }
            : candidate,
        ),
      }));
      void mutateGlobal(
        (key) =>
          Array.isArray(key) &&
          typeof key[0] === "string" &&
          key[0].endsWith("/learning-progress"),
      );
    } catch (reason) {
      updateTimeline((current) => ({
        seenTodayCount: Math.max(0, current.seenTodayCount - 1),
        items: current.items.map((candidate) =>
          candidate.uid === item.uid
            ? {
                ...candidate,
                seen_today: false,
                exposure_count: item.exposure_count,
              }
            : candidate,
        ),
      }));
      setActionError(
        reason instanceof Error
          ? reason.message
          : "閲覧を記録できませんでした。",
      );
    } finally {
      pendingExposureIds.current.delete(item.uid);
    }
  }

  if (isLoading) {
    return <Loading />;
  }

  const error =
    actionError ??
    (loadError instanceof Error
      ? loadError.message
      : loadError
        ? "TLを取得できませんでした。"
        : undefined);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-2">
      {error && (
        <p
          role="alert"
          className="border border-destructive/50 p-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {items.length === 0 && !error && (
        <p className="border p-2 text-sm text-muted-foreground">
          リソースをインポートすると、ここに新しい単文が並びます。
        </p>
      )}
      {items.length > 0 && (
        <>
          <div className="flex items-center gap-2 border-x border-t px-3 py-2 text-sm">
            <Eye className="size-4 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">今日の見たよ</span>
            <strong className="tabular-nums">{seenTodayCount}件</strong>
            <span className="ml-auto text-muted-foreground tabular-nums">
              今日のおすすめ {items.filter((item) => item.seen_today).length} /{" "}
              {items.length}
            </span>
          </div>
          <div className="divide-y border-y sm:border-x">
            {items.map((item) => (
              <div
                key={item.uid}
                data-hotkey-item
                tabIndex={-1}
                className="relative outline-none transition-colors after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:z-10 after:w-1.5 after:bg-transparent after:transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-inset data-[hotkey-active=true]:ring-primary data-[hotkey-active=true]:after:bg-primary data-[hotkey-active=true]:[&>[data-slot=card]]:bg-accent/70"
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === " ") {
                    event.preventDefault();
                    void markSeen(item);
                  }
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget
                      .querySelector<HTMLAnchorElement>(
                        `a[href="/tanbun/${item.uid}"]`,
                      )
                      ?.click();
                  }
                }}
              >
                <KnowledgeCard
                  compact
                  uid={item.uid}
                  sentence={item.sentence}
                  termNames={item.term_names ?? []}
                  score={item.score ?? 0}
                  scorePosition="none"
                  metadata={
                    <>
                      <Button
                        type="button"
                        variant={item.seen_today ? "ghost" : "outline"}
                        size="sm"
                        className={`h-7 shrink-0 gap-1 px-2 tabular-nums transition-transform disabled:opacity-100 ${
                          item.seen_today
                            ? "scale-105 text-primary"
                            : "text-foreground"
                        }`}
                        aria-label={
                          item.seen_today
                            ? `今日は記録済み、累計${item.exposure_count}日`
                            : `今日見たことを記録、累計${item.exposure_count}日`
                        }
                        title={item.seen_today ? "今日は記録済み" : "今日見た"}
                        disabled={item.seen_today}
                        onClick={() => void markSeen(item)}
                      >
                        <Eye
                          className={`size-3.5 transition-all ${
                            item.seen_today ? "fill-current" : ""
                          }`}
                        />
                        <span className="font-mono text-xs">
                          {item.exposure_count}
                        </span>
                      </Button>
                      <KnowledgeScore score={item.score ?? 0} />
                      <Link
                        to={`/resource/${item.resource_uid}#${item.uid}`}
                        className="min-w-0 truncate hover:text-foreground hover:underline"
                      >
                        {item.resource_name}
                      </Link>
                      <time
                        className="shrink-0"
                        dateTime={item.updated_at ?? undefined}
                      >
                        {formatDate(item.updated_at)}
                      </time>
                    </>
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "更新日不明";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}
