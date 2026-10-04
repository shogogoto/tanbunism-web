import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import Loading from "~/shared/components/Loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/shared/components/ui/alert-dialog";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import { useDebounce } from "~/shared/hooks/useDebounce";
import QuizPrompt from "./QuizPrompt";
import ReportedQuizManager from "./ReportedQuizManager";
import ResourceLearningOverview from "./ResourceLearningOverview";
import UnplannedQuizManager from "./UnplannedQuizManager";
import {
  type ManagedQuiz,
  type StudyResource,
  deleteQuiz,
  deleteQuizzes,
  listStudyResources,
  searchCreatedQuizzes,
} from "./api";
import {
  type QuizFilters,
  emptyQuizFilters,
  toQuizSearchParams,
} from "./quizFilters";
import { useQuizSWR } from "./useQuizSWR";

type LoadState =
  | { status: "loading" }
  | {
      status: "loaded";
      resources: StudyResource[];
      quizzes: ManagedQuiz[];
      total: number;
    }
  | { status: "error"; message: string };
type LoadedState = Extract<LoadState, { status: "loaded" }>;

const quizTypeLabels = {
  term2sent: "用語→単文",
  sent2term: "単文→用語",
  rel2pair: "関係→ペア",
  pair2rel: "ペア→関係",
} as const;
type QuizType = keyof typeof quizTypeLabels;

function QuizSearchFilters({
  filters,
  onChange,
}: {
  filters: QuizFilters;
  onChange: (filters: QuizFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount =
    Number(Boolean(filters.query.trim())) +
    filters.quizTypes.length +
    Number(Boolean(filters.answered)) +
    Number(Boolean(filters.createdFrom)) +
    Number(Boolean(filters.createdTo)) +
    Number(Boolean(filters.minAccuracy)) +
    Number(Boolean(filters.maxAccuracy));

  function toggleQuizType(quizType: QuizType) {
    onChange({
      ...filters,
      quizTypes: filters.quizTypes.includes(quizType)
        ? filters.quizTypes.filter((type) => type !== quizType)
        : [...filters.quizTypes, quizType],
    });
  }

  return (
    <Card className="sticky top-0 z-30 gap-0 bg-background/95 py-0 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-sm py-1 text-left hover:text-foreground"
          aria-label="クイズを絞り込む"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            <span className="hidden sm:inline">クイズを</span>絞り込む
          </span>
          {activeCount > 0 && <Badge variant="secondary">{activeCount}</Badge>}
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <label className="relative ml-auto min-w-0 flex-1 sm:max-w-sm">
          <span className="sr-only">検索文字列</span>
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            data-page-input-priority
            className="h-9 w-full rounded-md border bg-background pr-3 pl-9"
            value={filters.query}
            placeholder="問題文・選択肢を検索"
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
          />
        </label>
      </div>
      {open && (
        <CardContent className="space-y-4 border-t px-4 py-4 text-sm sm:px-6">
          <fieldset className="flex flex-wrap gap-3">
            <legend className="mb-2 font-medium">QuizType</legend>
            {Object.entries(quizTypeLabels).map(([type, label]) => (
              <label key={type} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.quizTypes.includes(type as QuizType)}
                  onChange={() => toggleQuizType(type as QuizType)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="grid gap-1">
            回答状態
            <select
              className="h-9 border bg-background px-2"
              value={filters.answered}
              onChange={(event) =>
                onChange({
                  ...filters,
                  answered: event.target.value as QuizFilters["answered"],
                })
              }
            >
              <option value="">すべて</option>
              <option value="false">未回答</option>
              <option value="true">回答済み</option>
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              作成日（開始）
              <input
                type="date"
                className="h-9 min-w-0 border bg-background px-2"
                value={filters.createdFrom}
                onChange={(event) =>
                  onChange({ ...filters, createdFrom: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1">
              作成日（終了）
              <input
                type="date"
                className="h-9 min-w-0 border bg-background px-2"
                value={filters.createdTo}
                onChange={(event) =>
                  onChange({ ...filters, createdTo: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1">
              最低正答率（%）
              <input
                type="number"
                min="0"
                max="100"
                className="h-9 min-w-0 border bg-background px-2"
                value={filters.minAccuracy}
                onChange={(event) =>
                  onChange({ ...filters, minAccuracy: event.target.value })
                }
              />
            </label>
            <label className="grid gap-1">
              最高正答率（%）
              <input
                type="number"
                min="0"
                max="100"
                className="h-9 min-w-0 border bg-background px-2"
                value={filters.maxAccuracy}
                onChange={(event) =>
                  onChange({ ...filters, maxAccuracy: event.target.value })
                }
              />
            </label>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(emptyQuizFilters)}
          >
            条件をクリア
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function ResourceSearchFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="sticky top-0 z-30 gap-0 bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
      <label className="relative block">
        <span className="sr-only">Resourceを絞る</span>
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          data-page-input-priority
          className="h-9 w-full rounded-md border bg-background pr-3 pl-9"
          value={value}
          placeholder="Resource名で絞り込み"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </Card>
  );
}

function Percentage({ value }: { value: number }) {
  return <>{Math.round(value * 100)}%</>;
}

export function formatCompactQuizDate(value: string, now = new Date()): string {
  const date = new Date(value);
  const dateDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAgo = Math.round((today - dateDay) / 86_400_000);

  if (daysAgo === 0) return "今日";
  if (daysAgo >= 1 && daysAgo <= 7) return `${daysAgo}日前`;
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function QuizCard({
  managed,
  onDelete,
  selected,
  onSelectedChange,
}: {
  managed: ManagedQuiz;
  onDelete: (quizId: string) => Promise<void>;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
}) {
  const { quiz } = managed;
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      await onDelete(quiz.quiz_id);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "クイズを削除できませんでした。",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0"
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
            aria-label={`クイズを選択: ${quiz.statement}`}
          />
          <CardTitle className="min-w-0 flex-1 text-base leading-relaxed">
            <QuizPrompt quiz={quiz} />
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(quiz.options).map(([optionId, option]) => (
          <div
            key={optionId}
            className="flex items-start gap-2 border p-2 text-sm"
          >
            {quiz.correct.includes(optionId) && <Badge>正解</Badge>}
            <span>{option}</span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          作成日時: {formatCompactQuizDate(quiz.created)}
        </p>
        <p className="text-xs text-muted-foreground">
          回答: {managed.attempts}回 · 正答率:{" "}
          {managed.accuracy === null ? (
            "未回答"
          ) : (
            <Percentage value={managed.accuracy} />
          )}
        </p>
      </CardContent>
      <CardFooter className="justify-end">
        {deleteError && (
          <p role="alert" className="mr-auto text-sm text-destructive">
            {deleteError}
          </p>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm">
              削除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>クイズを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                このクイズに対する回答履歴も削除されます。元の単文や知識関係は削除されません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? "削除中…" : "削除する"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

export default function QuizList({ embedded = false }: { embedded?: boolean }) {
  const [searchParams] = useSearchParams();
  const resourceId = searchParams.get("resource") ?? undefined;
  const sentenceId = searchParams.get("sentence") ?? undefined;
  const [filters, setFilters] = useState<QuizFilters>(emptyQuizFilters);
  const [resourceQuery, setResourceQuery] = useState("");
  const debouncedQuery = useDebounce(filters.query, 250);
  const appliedFilters = useMemo<QuizFilters>(
    () => ({
      query: debouncedQuery,
      quizTypes: filters.quizTypes,
      answered: filters.answered,
      createdFrom: filters.createdFrom,
      createdTo: filters.createdTo,
      minAccuracy: filters.minAccuracy,
      maxAccuracy: filters.maxAccuracy,
    }),
    [
      debouncedQuery,
      filters.quizTypes,
      filters.answered,
      filters.createdFrom,
      filters.createdTo,
      filters.minAccuracy,
      filters.maxAccuracy,
    ],
  );
  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string>();
  // biome-ignore lint/correctness/useExhaustiveDependencies: 絞り込み・対象Resourceが変わったら以前の選択を破棄する。
  useEffect(() => {
    setSelectedQuizIds(new Set());
  }, [resourceId, sentenceId, appliedFilters]);
  const { data, error, mutate } = useQuizSWR<LoadedState>(
    ["quiz-management", resourceId, sentenceId, appliedFilters],
    async (cacheOptions) => {
      const [resources, result] = await Promise.all([
        listStudyResources(cacheOptions),
        searchCreatedQuizzes(
          {
            resource_id: resourceId,
            sentence_id: sentenceId,
            ...toQuizSearchParams(appliedFilters),
            page: 1,
            size: 100,
          },
          cacheOptions,
        ),
      ]);
      return {
        status: "loaded",
        resources,
        quizzes: result.data,
        total: result.total,
      };
    },
    {
      dedupingInterval: 30_000,
      keepPreviousData: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );
  const loadState: LoadState =
    data ??
    (error
      ? {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "クイズを取得できませんでした。",
        }
      : { status: "loading" });

  async function handleDelete(quizId: string) {
    await deleteQuiz(quizId);
    await mutate(
      (current) =>
        current
          ? {
              ...current,
              quizzes: current.quizzes.filter(
                ({ quiz }) => quiz.quiz_id !== quizId,
              ),
              total: Math.max(0, current.total - 1),
            }
          : current,
      { revalidate: false },
    );
    setSelectedQuizIds((current) => {
      if (!current.has(quizId)) return current;
      const next = new Set(current);
      next.delete(quizId);
      return next;
    });
  }

  async function handleBulkDelete() {
    setIsBulkDeleting(true);
    setBulkDeleteError(undefined);
    try {
      await deleteQuizzes([...selectedQuizIds]);
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                quizzes: current.quizzes.filter(
                  ({ quiz }) => !selectedQuizIds.has(quiz.quiz_id),
                ),
                total: Math.max(0, current.total - selectedQuizIds.size),
              }
            : current,
        { revalidate: false },
      );
      setSelectedQuizIds(new Set());
    } catch (error) {
      setBulkDeleteError(
        error instanceof Error
          ? error.message
          : "選択したクイズを削除できませんでした。",
      );
    } finally {
      setIsBulkDeleting(false);
    }
  }

  const selectedResource =
    loadState.status === "loaded"
      ? loadState.resources.find((resource) => resource.uid === resourceId)
      : undefined;

  return (
    <div
      className={
        embedded
          ? "mx-auto max-w-3xl space-y-6"
          : "mx-auto max-w-3xl space-y-6 p-4 sm:p-6"
      }
    >
      {!embedded && (
        <header className="flex items-start justify-between gap-4">
          <div>
            {selectedResource && (
              <h1 className="text-2xl font-semibold">
                {selectedResource.name}
              </h1>
            )}
            <p className="text-sm text-muted-foreground">
              {resourceId
                ? sentenceId
                  ? "この単文から作成した問題・選択肢・正解を確認できます。"
                  : "このResourceから作成した問題・選択肢・正解を確認できます。"
                : "Resourceを開いて、学習状況と作成したクイズを確認します。"}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/quiz">クイズを解く</Link>
          </Button>
        </header>
      )}

      {loadState.status === "loading" && <Loading />}
      {loadState.status === "error" && (
        <p role="alert" className="text-destructive">
          {loadState.message}
        </p>
      )}
      {loadState.status === "loaded" && (
        <section className="space-y-3">
          {embedded && !resourceId && <ReportedQuizManager />}
          {embedded && !resourceId && <UnplannedQuizManager />}
          {!resourceId && (
            <>
              <ResourceSearchFilter
                value={resourceQuery}
                onChange={setResourceQuery}
              />
              <ResourceLearningOverview resourceQuery={resourceQuery} />
            </>
          )}
          {resourceId && (
            <Button asChild variant="ghost" size="sm">
              <Link
                to={embedded ? "/dashboard?view=quiz-management" : "/quiz/list"}
              >
                ← Resource一覧へ
              </Link>
            </Button>
          )}
          {resourceId && (
            <>
              <h2 className="text-lg font-semibold">このResourceのクイズ</h2>
              <QuizSearchFilters filters={filters} onChange={setFilters} />
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={
                      loadState.quizzes.length > 0 &&
                      loadState.quizzes.every(({ quiz }) =>
                        selectedQuizIds.has(quiz.quiz_id),
                      )
                    }
                    onChange={(event) =>
                      setSelectedQuizIds(
                        event.target.checked
                          ? new Set(
                              loadState.quizzes.map(({ quiz }) => quiz.quiz_id),
                            )
                          : new Set(),
                      )
                    }
                  />
                  表示中をすべて選択
                </label>
                <span className="text-xs text-muted-foreground">
                  {loadState.total}件
                </span>
                {selectedQuizIds.size > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="ml-auto"
                        variant="destructive"
                        size="sm"
                      >
                        {selectedQuizIds.size}件を削除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          選択した{selectedQuizIds.size}件を削除しますか？
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          対象クイズの回答履歴も削除されます。元の単文や知識関係は削除されません。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={isBulkDeleting}
                          onClick={handleBulkDelete}
                        >
                          {isBulkDeleting ? "削除中…" : "まとめて削除する"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              {bulkDeleteError && (
                <p role="alert" className="text-sm text-destructive">
                  {bulkDeleteError}
                </p>
              )}
              {loadState.quizzes.length === 0 ? (
                <p className="border p-4 text-sm text-muted-foreground">
                  {resourceId
                    ? "このResourceから作成したクイズはありません。"
                    : "条件に合う作成済みクイズはありません。"}
                </p>
              ) : (
                loadState.quizzes.map((managed) => (
                  <QuizCard
                    key={managed.quiz.quiz_id}
                    managed={managed}
                    onDelete={handleDelete}
                    selected={selectedQuizIds.has(managed.quiz.quiz_id)}
                    onSelectedChange={(selected) =>
                      setSelectedQuizIds((current) => {
                        const next = new Set(current);
                        if (selected) next.add(managed.quiz.quiz_id);
                        else next.delete(managed.quiz.quiz_id);
                        return next;
                      })
                    }
                  />
                ))
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
