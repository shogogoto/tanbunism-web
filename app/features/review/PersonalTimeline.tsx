import { Eye } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { useSWRConfig } from "swr";
import { invalidateGamification } from "~/features/gamification/invalidate";
import KnowledgeCard, {
  KnowledgeScore,
} from "~/features/tanbun/components/KnowledgeCard";
import { useTanbunPreview } from "~/features/tanbun/detail/Preview";
import Loading from "~/shared/components/Loading";
import { Button } from "~/shared/components/ui/button";
import { usePersistentSWR } from "~/shared/hooks/swr/useCache";
import { genericCache } from "~/shared/lib/indexed";
import { useRecommendationDay } from "~/shared/lib/recommendationDay";
import {
  type PersonalTanbunItem,
  addPersonalTanbuns,
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

export default function PersonalTimeline({
  profile = "default",
}: { profile?: string }) {
  const { mutate: mutateGlobal } = useSWRConfig();
  const { openPreview, preview } = useTanbunPreview();
  const day = useRecommendationDay();
  const cacheKey = `${PERSONAL_TIMELINE_CACHE_KEY}:${profile}:${day}`;
  const {
    data,
    error: loadError,
    isLoading,
    mutate,
  } = usePersistentSWR<PersonalTimelineData>(
    ["dashboard-personal-timeline", profile, day],
    async () => {
      const [items, today] = await Promise.all([
        listPersonalTanbuns(profile),
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
  const [adding, setAdding] = useState(false);
  const [exhausted, setExhausted] = useState(false);
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
      void invalidateGamification(mutateGlobal, { preserveData: true }).catch(
        () => undefined,
      );
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

  async function addMore() {
    setAdding(true);
    setActionError(undefined);
    try {
      const next = await addPersonalTanbuns(profile);
      setExhausted(next.length === items.length || next.length >= 500);
      updateTimeline((current) => ({ ...current, items: next }));
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "追加できませんでした。",
      );
    } finally {
      setAdding(false);
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
      {preview}
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
          この設定に合う単文はありません。対象リソースを見直すか、読書メモをインポートしてください。
        </p>
      )}
      {items.length > 0 && (
        <>
          <div className="sticky top-[var(--review-controls-height,0px)] z-10 flex flex-wrap items-center gap-2 border bg-background px-3 py-2 text-sm">
            <Eye className="size-4 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">
              {profile.startsWith("plan:")
                ? "今日の見たよ（全体）"
                : "今日の見たよ"}
            </span>
            <strong className="tabular-nums">{seenTodayCount}件</strong>
            <span className="ml-auto text-muted-foreground tabular-nums">
              {profile.startsWith("plan:")
                ? "この計画の知識"
                : "今日のおすすめ"}{" "}
              {items.filter((item) => item.seen_today).length} / {items.length}
            </span>
          </div>
          {items.every((item) => item.seen_today) && (
            <div className="py-2 text-center">
              <Button
                variant="outline"
                disabled={adding || exhausted}
                onClick={() => void addMore()}
              >
                {exhausted
                  ? "今日の追加候補はありません"
                  : adding
                    ? "選んでいます…"
                    : "もう少し復習する"}
              </Button>
            </div>
          )}
          <div className="divide-y border-y sm:border-x">
            {items.map((item) => (
              <div
                key={item.uid}
                data-hotkey-item
                tabIndex={-1}
                className="relative scroll-mt-[calc(var(--review-controls-height,0px)+4rem)] outline-none transition-colors after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:z-10 after:w-1.5 after:bg-transparent after:transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-inset data-[hotkey-active=true]:ring-primary data-[hotkey-active=true]:after:bg-primary data-[hotkey-active=true]:[&>[data-slot=card]]:bg-accent/70"
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
                  onPreview={() => openPreview({ sentenceId: item.uid })}
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
