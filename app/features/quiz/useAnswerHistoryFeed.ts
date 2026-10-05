import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import {
  type AnswerHistoryItem,
  type QuizChain,
  type QuizType,
  listAnswerHistory,
} from "./api";

export type AnswerFilters = {
  correct: "" | "true" | "false";
  quizType: QuizType | "";
  resourceId: string;
};
type FeedState = {
  filters: AnswerFilters;
  items: AnswerHistoryItem[];
  total: number;
  nextPage: number;
  loaded: boolean;
  hasMore: boolean;
  currentId?: string;
  expanded: Record<string, boolean>;
  chains: Record<string, QuizChain>;
  scrollTop: number;
};
const emptyFeed = (): FeedState => ({
  filters: { correct: "", quizType: "", resourceId: "" },
  items: [],
  total: 0,
  nextPage: 1,
  loaded: false,
  hasMore: true,
  expanded: {},
  chains: {},
  scrollTop: 0,
});

function readFeed(key: string): FeedState {
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (
      cached?.filters &&
      Array.isArray(cached.items) &&
      cached.expanded &&
      cached.chains
    )
      return cached;
  } catch {
    // Browsers may disable session storage.
  }
  return emptyFeed();
}

function scrollContainer(element: HTMLElement): HTMLElement {
  let parent = element.parentElement;
  while (parent) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) return parent;
    parent = parent.parentElement;
  }
  return (document.scrollingElement ?? document.documentElement) as HTMLElement;
}

export function useAnswerHistoryFeed() {
  const { user } = useAuth();
  const location = useLocation();
  const storageKey = `answer-history:${user?.uid ?? "anonymous"}:${location.key}`;
  const [feed, setFeed] = useState(emptyFeed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const currentFeed = useRef(feed);
  const pending = useRef(false);
  const generation = useRef(0);
  const restored = useRef(false);
  const initialized = useRef(false);
  const focusNext = useRef(false);
  currentFeed.current = feed;

  const persist = useCallback(
    (state: FeedState) => {
      const root = rootRef.current;
      const snapshot = {
        ...state,
        scrollTop: root ? scrollContainer(root).scrollTop : state.scrollTop,
      };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch {
        // The feed remains usable when the browser storage quota is reached.
      }
    },
    [storageKey],
  );

  const save = useCallback(() => persist(currentFeed.current), [persist]);

  useEffect(() => {
    if (feed === currentFeed.current) persist(feed);
  }, [feed, persist]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!initialized.current) {
      initialized.current = true;
      const cached = readFeed(storageKey);
      currentFeed.current = cached;
      setFeed(cached);
    }
    const container = scrollContainer(root);
    const frame = requestAnimationFrame(() => {
      if (restored.current) return;
      container.scrollTop = currentFeed.current.scrollTop;
      const row = Array.from(
        root.querySelectorAll<HTMLElement>("[data-answer-id]"),
      ).find(
        (candidate) =>
          candidate.dataset.answerId === currentFeed.current.currentId,
      );
      row?.focus({ preventScroll: true });
      restored.current = true;
    });
    const onScroll = () => {
      if (restored.current) save();
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener("scroll", onScroll);
    };
  }, [save, storageKey]);

  useEffect(
    () => () => {
      generation.current += 1;
      pending.current = false;
    },
    [],
  );

  const loadMore = useCallback(async (filters?: AnswerFilters) => {
    const current = currentFeed.current;
    const requestedFilters = filters ?? current.filters;
    if (pending.current || !current.hasMore) return;
    pending.current = true;
    const requestGeneration = generation.current;
    setLoading(true);
    setError(undefined);
    try {
      const result = await listAnswerHistory({
        is_correct:
          requestedFilters.correct === ""
            ? undefined
            : requestedFilters.correct === "true",
        quiz_type: requestedFilters.quizType || undefined,
        resource_id: requestedFilters.resourceId || undefined,
        page: current.nextPage,
        size: 20,
      });
      if (requestGeneration !== generation.current) return;
      const existing = new Set(
        current.items.map((item) => item.answer.answer_uid),
      );
      const added = result.data.filter(
        (item) => !existing.has(item.answer.answer_uid),
      );
      const nextId = focusNext.current
        ? added[0]?.answer.answer_uid
        : undefined;
      focusNext.current = false;
      setFeed((previous) => {
        return {
          ...previous,
          items: [...previous.items, ...added],
          total: result.total,
          nextPage: current.nextPage + 1,
          loaded: true,
          hasMore:
            result.data.length > 0 && current.nextPage * 20 < result.total,
          currentId: nextId ?? previous.currentId,
        };
      });
    } catch (reason) {
      if (requestGeneration === generation.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : "回答履歴を取得できませんでした。",
        );
        focusNext.current = false;
      }
    } finally {
      if (requestGeneration === generation.current) {
        pending.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (
      !currentFeed.current.loaded &&
      feed.filters === currentFeed.current.filters
    )
      void loadMore(feed.filters);
  }, [feed.filters, loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (
      !sentinel ||
      !feed.loaded ||
      !feed.hasMore ||
      loading ||
      error ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          currentFeed.current.nextPage === feed.nextPage
        )
          void loadMore();
      },
      { rootMargin: "320px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feed.loaded, feed.hasMore, feed.nextPage, loading, error, loadMore]);

  useEffect(() => {
    if (!feed.currentId) return;
    const row = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>("[data-answer-id]") ?? [],
    ).find((candidate) => candidate.dataset.answerId === feed.currentId);
    if (focusNext.current) return;
    // Only move focus when an appended row became current through keyboard navigation.
    if (
      row &&
      document.activeElement?.hasAttribute("data-answer-id") &&
      document.activeElement !== row
    ) {
      row.focus();
      row.scrollIntoView({ block: "nearest" });
    }
  }, [feed.currentId]);

  function updateFilters(update: Partial<AnswerFilters>) {
    generation.current += 1;
    pending.current = false;
    focusNext.current = false;
    setError(undefined);
    setFeed({ ...emptyFeed(), filters: { ...feed.filters, ...update } });
    if (rootRef.current) scrollContainer(rootRef.current).scrollTop = 0;
  }

  return {
    feed,
    setFeed,
    loading,
    error,
    rootRef,
    sentinelRef,
    save,
    loadMore,
    updateFilters,
    loadNextForKeyboard: () => {
      if (!currentFeed.current.hasMore) return;
      focusNext.current = true;
      void loadMore();
    },
  };
}
