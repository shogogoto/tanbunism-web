import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
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
  const [markingId, setMarkingId] = useState<string>();
  const [error, setError] = useState<string>();

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
    if (item.seen_today || markingId) return;
    setMarkingId(item.uid);
    setError(undefined);
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
      setError(
        reason instanceof Error
          ? reason.message
          : "閲覧を記録できませんでした。",
      );
    } finally {
      setMarkingId(undefined);
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-muted-foreground">TLを読み込み中…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {items.length === 0 && !error && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          読書メモを取り込むと、ここに新しい単文が並びます。
        </p>
      )}
      {items.map((item) => (
        <KnowledgeCard
          key={item.uid}
          uid={item.uid}
          sentence={item.sentence}
          termNames={item.term_names ?? []}
          score={item.score ?? 0}
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
                className={`h-7 shrink-0 gap-1 px-2 tabular-nums disabled:opacity-100 ${
                  item.seen_today ? "text-muted-foreground" : "text-foreground"
                }`}
                aria-label={
                  item.seen_today
                    ? `今日は記録済み、累計${item.exposure_count}日`
                    : `今日見たことを記録、累計${item.exposure_count}日`
                }
                title={item.seen_today ? "今日は記録済み" : "今日見た"}
                disabled={item.seen_today || markingId === item.uid}
                onClick={() => void markSeen(item)}
              >
                <Eye className="size-3.5" />
                {item.exposure_count}
              </Button>
            </>
          }
        />
      ))}
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
