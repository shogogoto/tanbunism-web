import { Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import KnowledgeCard, {
  KnowledgeScore,
} from "~/features/tanbun/components/KnowledgeCard";
import Loading from "~/shared/components/Loading";
import { Button } from "~/shared/components/ui/button";
import {
  type PersonalTanbunItem,
  getTodayTanbunExposureCount,
  listPersonalTanbuns,
  markTanbunSeen,
} from "./api";

export default function PersonalTimeline() {
  const [items, setItems] = useState<PersonalTanbunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [seenTodayCount, setSeenTodayCount] = useState(0);
  const pendingExposureIds = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    Promise.all([listPersonalTanbuns(), getTodayTanbunExposureCount()])
      .then(([loaded, today]) => {
        if (active) {
          setItems(loaded);
          setSeenTodayCount(today.count);
        }
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "TLを取得できませんでした。",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function markSeen(item: PersonalTanbunItem) {
    if (item.seen_today || pendingExposureIds.current.has(item.uid)) return;
    pendingExposureIds.current.add(item.uid);
    setError(undefined);
    setSeenTodayCount((current) => current + 1);
    setItems((current) =>
      current.map((candidate) =>
        candidate.uid === item.uid
          ? {
              ...candidate,
              seen_today: true,
              exposure_count: candidate.exposure_count + 1,
            }
          : candidate,
      ),
    );
    try {
      const result = await markTanbunSeen(item.uid);
      setItems((current) =>
        current.map((candidate) =>
          candidate.uid === item.uid
            ? {
                ...candidate,
                seen_today: true,
                exposure_count: result.exposure_count,
              }
            : candidate,
        ),
      );
      const today = await getTodayTanbunExposureCount().catch(() => undefined);
      if (today) setSeenTodayCount(today.count);
    } catch (reason) {
      setItems((current) =>
        current.map((candidate) =>
          candidate.uid === item.uid
            ? {
                ...candidate,
                seen_today: false,
                exposure_count: item.exposure_count,
              }
            : candidate,
        ),
      );
      setSeenTodayCount((current) => Math.max(0, current - 1));
      setError(
        reason instanceof Error
          ? reason.message
          : "閲覧を記録できませんでした。",
      );
    } finally {
      pendingExposureIds.current.delete(item.uid);
    }
  }

  if (loading) {
    return <Loading />;
  }

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
          読書メモをimportすると、ここに新しい単文が並びます。
        </p>
      )}
      {items.length > 0 && (
        <>
          <div className="flex items-center gap-2 border-x border-t px-3 py-2 text-sm">
            <Eye className="size-4 text-primary" aria-hidden="true" />
            <span className="text-muted-foreground">今日の見たよ</span>
            <strong className="tabular-nums">{seenTodayCount}件</strong>
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
