import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPrompt from "~/features/quiz/QuizPrompt";
import type { ReadableQuiz } from "~/features/quiz/api";

type Item = {
  quiz: ReadableQuiz;
  target_score: number;
  resource_id: string;
  resource_name: string;
  creator_id: string;
  creator_username?: string | null;
};
const api = import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export default function QuizSearch({ query }: { query: string }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState<string>();
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    fetch(
      `${api}/quiz/search?${new URLSearchParams({ q: query, page: String(page), size: "20" })}`,
      { signal: controller.signal, credentials: "include" },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("クイズを取得できませんでした。");
        return (await response.json()) as { data: Item[]; total: number };
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          setItems((previous) =>
            page === 1 ? result.data : [...previous, ...result.data],
          );
          setTotal(result.total);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "クイズを取得できませんでした。",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, page]);
  useEffect(() => {
    if (!sentinel.current || loading || error || items.length >= total) return;
    let requested = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !requested) {
        requested = true;
        setPage((previous) => previous + 1);
      }
    });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loading, error, items.length, total]);
  return (
    <div className="mx-auto w-full max-w-5xl p-2 sm:p-3">
      <p className="mb-2 text-xs text-muted-foreground">
        対象単文のスコアが高い順 · {total}件
      </p>
      {items.map((item) => (
        <article
          key={item.quiz.quiz_id}
          data-hotkey-item
          tabIndex={-1}
          className="relative border-b p-2 outline-none data-[hotkey-active=true]:z-10 data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-inset data-[hotkey-active=true]:ring-primary"
          onKeyDown={(event) => {
            if (
              event.target === event.currentTarget &&
              event.key === "Enter" &&
              !event.nativeEvent.isComposing &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              event.preventDefault();
              event.currentTarget
                .querySelector<HTMLButtonElement>("[data-search-result-open]")
                ?.click();
            }
          }}
        >
          <div className="mb-1 flex gap-2 text-xs text-muted-foreground">
            <span>スコア {item.target_score}</span>
            <Link
              className="truncate hover:underline"
              to={`/resource/${item.resource_id}`}
            >
              {item.resource_name}
            </Link>
            <Link
              className="ml-auto shrink-0 hover:underline"
              to={`/user/${item.creator_username || item.creator_id}`}
            >
              @{item.creator_username || item.creator_id.slice(0, 8)}
            </Link>
          </div>
          <button
            type="button"
            data-search-result-open
            className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={expanded === item.quiz.quiz_id}
            onClick={() =>
              setExpanded((previous) =>
                previous === item.quiz.quiz_id ? undefined : item.quiz.quiz_id,
              )
            }
          >
            <QuizPrompt quiz={item.quiz} compact />
          </button>
          {expanded === item.quiz.quiz_id &&
            (isAuthenticated ? (
              <QuizAttempt quiz={item.quiz} showStatement={false} />
            ) : (
              <Link to="/login" className="text-sm underline">
                ログインして回答する
              </Link>
            ))}
        </article>
      ))}
      {error && <p role="alert">{error}</p>}
      {loading && <output>読み込み中…</output>}
      {!loading && !error && total === 0 && (
        <p>クイズが見つかりませんでした。</p>
      )}
      <div ref={sentinel} />
      {!loading && !error && items.length < total && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setPage((previous) => previous + 1)}
        >
          もっと表示
        </button>
      )}
    </div>
  );
}
