import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/shared/components/ui/collapsible";
import {
  type ManagedQuiz,
  type QuizResourceStatus,
  type ResourceLearningStatus,
  type StudyResource,
  deleteQuiz,
  getLearningProgress,
  listCreatedQuizResources,
  listStudyResources,
  searchCreatedQuizzes,
} from "./api";

type LoadState =
  | { status: "loading" }
  | {
      status: "loaded";
      resources: StudyResource[];
      createdByResource: Map<string, QuizResourceStatus>;
      learningByResource: Map<string, ResourceLearningStatus>;
      quizzes?: ManagedQuiz[];
    }
  | { status: "error"; message: string };

const quizTypeLabels = {
  term2sent: "用語→単文",
  sent2term: "単文→用語",
  rel2pair: "関係→ペア",
  pair2rel: "ペア→関係",
} as const;
type QuizType = keyof typeof quizTypeLabels;

type QuizFilters = {
  quizTypes: QuizType[];
  answered: "" | "true" | "false";
  createdFrom: string;
  createdTo: string;
  minAccuracy: string;
  maxAccuracy: string;
};

const emptyFilters: QuizFilters = {
  quizTypes: [],
  answered: "",
  createdFrom: "",
  createdTo: "",
  minAccuracy: "",
  maxAccuracy: "",
};

function QuizSearchFilters({
  filters,
  onChange,
}: {
  filters: QuizFilters;
  onChange: (filters: QuizFilters) => void;
}) {
  function toggleQuizType(quizType: QuizType) {
    onChange({
      ...filters,
      quizTypes: filters.quizTypes.includes(quizType)
        ? filters.quizTypes.filter((type) => type !== quizType)
        : [...filters.quizTypes, quizType],
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">クイズを絞り込む</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
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
              className="h-9 border bg-background px-2"
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
              className="h-9 border bg-background px-2"
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
              className="h-9 border bg-background px-2"
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
              className="h-9 border bg-background px-2"
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
          onClick={() => onChange(emptyFilters)}
        >
          条件をクリア
        </Button>
      </CardContent>
    </Card>
  );
}

function Percentage({ value }: { value: number }) {
  return <>{Math.round(value * 100)}%</>;
}

function CompactLearningProgress({
  status,
}: {
  status: ResourceLearningStatus;
}) {
  const attempts = Object.values(status.by_quiz_type).reduce(
    (total, learning) => total + learning.performance.attempts,
    0,
  );

  return (
    <div className="grid shrink-0 grid-cols-3 gap-3 text-right text-xs sm:gap-5">
      <div title="対象単文にクイズを用意した割合">
        <div className="font-semibold tabular-nums">
          <Percentage value={status.overall_coverage} />
        </div>
        <div className="text-muted-foreground">Coverage</div>
      </div>
      <div title="用意したクイズに回答した割合">
        <div className="font-semibold tabular-nums">
          <Percentage value={status.overall_attempt_rate} />
        </div>
        <div className="text-muted-foreground">Attempt</div>
      </div>
      <div title="回答の正答率">
        <div className="font-semibold tabular-nums">
          {attempts === 0 ? (
            "—"
          ) : (
            <Percentage value={status.overall_accuracy} />
          )}
        </div>
        <div className="text-muted-foreground">Accuracy</div>
      </div>
    </div>
  );
}

function CompactQuiz({
  managed,
  onDelete,
}: {
  managed: ManagedQuiz;
  onDelete: (quizId: string) => Promise<void>;
}) {
  const { quiz } = managed;
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete(quiz.quiz_id);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <details className="group border-t first:border-t-0">
      <summary className="cursor-pointer list-none px-3 py-3 hover:bg-muted/40">
        <div className="flex items-start gap-2">
          <ChevronRight className="mt-0.5 size-4 shrink-0 transition-transform group-open:rotate-90" />
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-line text-sm leading-relaxed">
              {quiz.statement}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {managed.attempts === 0
                ? "未回答"
                : `${managed.attempts}回答 · 正答率 ${Math.round(
                    (managed.accuracy ?? 0) * 100,
                  )}%`}
            </p>
          </div>
        </div>
      </summary>
      <div className="space-y-2 bg-muted/20 px-4 pb-4 pt-2">
        {Object.entries(quiz.options).map(([optionId, option]) => (
          <div key={optionId} className="flex items-start gap-2 text-sm">
            {quiz.correct.includes(optionId) && (
              <Badge className="shrink-0">正解</Badge>
            )}
            <span>{option}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
          <time>{new Date(quiz.created).toLocaleString("ja-JP")}</time>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
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
        </div>
      </div>
    </details>
  );
}

function ResourceDisclosure({
  resource,
  status,
  learning,
}: {
  resource: StudyResource;
  status?: QuizResourceStatus;
  learning?: ResourceLearningStatus;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [quizzes, setQuizzes] = useState<ManagedQuiz[]>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [quizCount, setQuizCount] = useState(status?.total_quizzes ?? 0);
  const counts = Object.entries(status?.quiz_counts ?? {});

  async function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open || quizzes || quizCount === 0) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await searchCreatedQuizzes({
        resource_id: resource.uid,
        page: 1,
        size: 100,
      });
      setQuizzes(result.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "クイズを取得できませんでした。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(quizId: string) {
    await deleteQuiz(quizId);
    setQuizzes((current) =>
      current?.filter(({ quiz }) => quiz.quiz_id !== quizId),
    );
    setQuizCount((current) => Math.max(0, current - 1));
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className="rounded-md border bg-card"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40 sm:p-4"
        >
          <ChevronRight className="size-5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{resource.name}</p>
            <p className="text-xs text-muted-foreground">
              {quizCount}問作成済み
            </p>
          </div>
          {learning && <CompactLearningProgress status={learning} />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            {counts.map(([type, count]) => (
              <Badge key={type} variant="secondary">
                {quizTypeLabels[type as keyof typeof quizTypeLabels] ?? type}{" "}
                {count}
              </Badge>
            ))}
            <div className="ml-auto flex gap-3 text-xs">
              <Link
                className="underline underline-offset-4"
                to={`/resource/${resource.uid}`}
              >
                単文を見る
              </Link>
              <Link
                className="underline underline-offset-4"
                to={`?resource=${resource.uid}`}
              >
                絞り込む
              </Link>
            </div>
          </div>
          {isLoading && (
            <p className="border-t p-4 text-sm text-muted-foreground">
              クイズを読み込み中…
            </p>
          )}
          {error && (
            <p role="alert" className="border-t p-4 text-sm text-destructive">
              {error}
            </p>
          )}
          {!isLoading && !error && quizCount === 0 && (
            <p className="border-t p-4 text-sm text-muted-foreground">
              このResourceから作成したクイズはありません。
            </p>
          )}
          {!isLoading &&
            !error &&
            quizzes?.map((managed) => (
              <CompactQuiz
                key={managed.quiz.quiz_id}
                managed={managed}
                onDelete={handleDelete}
              />
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function QuizCard({
  managed,
  onDelete,
}: {
  managed: ManagedQuiz;
  onDelete: (quizId: string) => Promise<void>;
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
        <CardTitle className="whitespace-pre-line text-base leading-relaxed">
          {quiz.statement}
        </CardTitle>
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
          作成日時: {new Date(quiz.created).toLocaleString("ja-JP")}
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

export default function QuizList() {
  const [searchParams] = useSearchParams();
  const resourceId = searchParams.get("resource") ?? undefined;
  const sentenceId = searchParams.get("sentence") ?? undefined;
  const [filters, setFilters] = useState<QuizFilters>(emptyFilters);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    Promise.all([
      listStudyResources(),
      listCreatedQuizResources(),
      resourceId
        ? searchCreatedQuizzes({
            resource_id: resourceId,
            sentence_id: sentenceId,
            quiz_types:
              filters.quizTypes.length > 0 ? filters.quizTypes : undefined,
            answered:
              filters.answered === "" ? undefined : filters.answered === "true",
            created_from: filters.createdFrom
              ? `${filters.createdFrom}T00:00:00+09:00`
              : undefined,
            created_to: filters.createdTo
              ? `${filters.createdTo}T23:59:59+09:00`
              : undefined,
            min_accuracy: filters.minAccuracy
              ? Number(filters.minAccuracy) / 100
              : undefined,
            max_accuracy: filters.maxAccuracy
              ? Number(filters.maxAccuracy) / 100
              : undefined,
            page: 1,
            size: 100,
          }).then(({ data }) => data)
        : Promise.resolve(undefined),
    ])
      .then(async ([resources, createdStatuses, quizzes]) => {
        const learning = await Promise.all(
          resources.map(
            async (resource) =>
              [resource.uid, await getLearningProgress(resource.uid)] as const,
          ),
        );
        if (active) {
          setLoadState({
            status: "loaded",
            resources,
            createdByResource: new Map(
              createdStatuses.map((status) => [status.resource.uid, status]),
            ),
            learningByResource: new Map(learning),
            quizzes,
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "クイズを取得できませんでした。",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [resourceId, sentenceId, filters]);

  async function handleDelete(quizId: string) {
    await deleteQuiz(quizId);
    setLoadState((current) =>
      current.status === "loaded"
        ? {
            ...current,
            quizzes: current.quizzes?.filter(
              ({ quiz }) => quiz.quiz_id !== quizId,
            ),
          }
        : current,
    );
  }

  const selectedResource =
    loadState.status === "loaded"
      ? loadState.resources.find((resource) => resource.uid === resourceId)
      : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {selectedResource?.name ?? "クイズと学習状況"}
          </h1>
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

      {loadState.status === "loading" && <p>読み込み中…</p>}
      {loadState.status === "error" && (
        <p role="alert" className="text-destructive">
          {loadState.message}
        </p>
      )}
      {loadState.status === "loaded" && !resourceId && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Resource別の学習状況</h2>
          {loadState.resources.length === 0 ? (
            <p className="border p-4 text-sm text-muted-foreground">
              学習対象のResourceはありません。
            </p>
          ) : (
            loadState.resources.map((resource) => (
              <ResourceDisclosure
                key={resource.uid}
                resource={resource}
                status={loadState.createdByResource.get(resource.uid)}
                learning={loadState.learningByResource.get(resource.uid)}
              />
            ))
          )}
        </section>
      )}
      {loadState.status === "loaded" && resourceId && (
        <section className="space-y-3">
          {resourceId && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/quiz/list">← Resource一覧へ</Link>
            </Button>
          )}
          <h2 className="text-lg font-semibold">
            {resourceId ? "このResourceのクイズ" : "作成済みクイズ"}
          </h2>
          <QuizSearchFilters filters={filters} onChange={setFilters} />
          {loadState.quizzes?.length === 0 ? (
            <p className="border p-4 text-sm text-muted-foreground">
              {resourceId
                ? "このResourceから作成したクイズはありません。"
                : "条件に合う作成済みクイズはありません。"}
            </p>
          ) : (
            loadState.quizzes?.map((managed) => (
              <QuizCard
                key={managed.quiz.quiz_id}
                managed={managed}
                onDelete={handleDelete}
              />
            ))
          )}
        </section>
      )}
    </div>
  );
}
