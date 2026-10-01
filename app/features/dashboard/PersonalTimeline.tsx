import { Eye } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import KnowledgeCard from "~/features/tanbun/components/KnowledgeCard";
import { Button } from "~/shared/components/ui/button";
import {
  type PersonalTanbunItem,
  listPersonalTanbuns,
  markTanbunSeen,
} from "./api";

export default function PersonalTimeline() {
  const [items, setItems] = useState<PersonalTanbunItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const pendingExposureIds = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    listPersonalTanbuns()
      .then((loaded) => {
        if (active) setItems(loaded);
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
    return <p className="p-4 text-sm text-muted-foreground">TLを読み込み中…</p>;
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
          読書メモを取り込むと、ここに新しい単文が並びます。
        </p>
      )}
      {items.length > 0 && (
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
                scorePosition="start"
                metadata={
                  <>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-6 shrink-0 gap-1 px-1.5 tabular-nums transition-transform disabled:opacity-100 ${
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
                      {item.exposure_count}
                    </Button>
                  </>
                }
              />
            </div>
          ))}
        </div>
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
