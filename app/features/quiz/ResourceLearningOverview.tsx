import { AlertTriangle, ChevronRight, Info } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import useSWR from "swr";
import Loading from "~/shared/components/Loading";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/shared/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/shared/components/ui/popover";
import BrokenQuizManager from "./BrokenQuizManager";
import QuizPrompt from "./QuizPrompt";
import {
  type ManagedQuiz,
  type QuizResourceStatus,
  type ResourceLearningStatus,
  type StudyResource,
  getLearningProgress,
  listBrokenQuizReferences,
  listCreatedQuizResources,
  listStudyResources,
  searchCreatedQuizzes,
} from "./api";
import { type QuizFilters, toQuizSearchParams } from "./quizFilters";

type ResourceStatus = {
  resource: StudyResource;
  quizzes?: QuizResourceStatus;
  learning?: ResourceLearningStatus;
};

function Percentage({ value }: { value: number }) {
  return <>{Math.round(value * 100)}%</>;
}

function Progress({ status }: { status?: ResourceLearningStatus }) {
  if (!status) {
    return (
      <>
        <span className="text-center text-muted-foreground">—</span>
        <span className="text-center text-muted-foreground">—</span>
        <span className="text-center text-muted-foreground">—</span>
      </>
    );
  }
  const attempts = Object.values(status.by_quiz_type).reduce(
    (total, item) => total + item.performance.attempts,
    0,
  );
  return (
    <>
      <b className="text-center text-xs tabular-nums">
        <Percentage value={status.overall_coverage} />
      </b>
      <b className="text-center text-xs tabular-nums">
        <Percentage value={status.overall_attempt_rate} />
      </b>
      <b className="text-center text-xs tabular-nums">
        {attempts === 0 ? "—" : <Percentage value={status.overall_accuracy} />}
      </b>
    </>
  );
}

function MetricHeader({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 items-center justify-center gap-1 truncate text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-label={`${label}の説明`}
          title={description}
        >
          <span className="truncate">{label}</span>
          <Info className="hidden size-3 shrink-0 sm:block" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm" align="center">
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </PopoverContent>
    </Popover>
  );
}

function ResourceDisclosure({
  item,
  filters,
}: {
  item: ResourceStatus;
  filters: QuizFilters;
}) {
  const { resource, quizzes: status, learning } = item;
  const [open, setOpen] = useState(false);
  const total = status?.total_quizzes ?? 0;
  const searchParams = toQuizSearchParams(filters);
  const { data, error, isLoading } = useSWR(
    open && total > 0
      ? ["quiz-management-resource", resource.uid, searchParams]
      : null,
    () =>
      searchCreatedQuizzes(
        {
          resource_id: resource.uid,
          ...searchParams,
          page: 1,
          size: 100,
        },
        { waitForRefresh: true },
      ),
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );
  const quizzes: ManagedQuiz[] | undefined = data?.data;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          data-hotkey-item
          className="group grid w-full grid-cols-[minmax(0,1fr)_repeat(3,3.5rem)] items-center px-3 py-3 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[hotkey-active=true]:bg-accent/60 data-[hotkey-active=true]:outline-2 data-[hotkey-active=true]:-outline-offset-2 data-[hotkey-active=true]:outline-foreground sm:grid-cols-[minmax(0,1fr)_repeat(3,5rem)]"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <ChevronRight className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
            <p className="truncate text-sm font-medium">{resource.name}</p>
            <Badge variant="secondary">{total}問</Badge>
          </div>
          <Progress status={learning} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t bg-muted/15">
          {open && total > 0 && isLoading && <Loading />}
          {error && (
            <p className="px-9 py-3 text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "クイズを取得できませんでした。"}
            </p>
          )}
          {total === 0 && (
            <p className="px-9 py-3 text-sm text-muted-foreground">
              このResourceから作成したクイズはありません。
            </p>
          )}
          {quizzes?.map((managed) => (
            <div
              key={managed.quiz.quiz_id}
              className="border-b px-9 py-2 last:border-b-0"
            >
              <QuizPrompt quiz={managed.quiz} compact />
              <p className="mt-1 text-xs text-muted-foreground">
                {managed.attempts === 0
                  ? "未回答"
                  : `${managed.attempts}回答 · 正答率 ${Math.round((managed.accuracy ?? 0) * 100)}%`}
              </p>
            </div>
          ))}
          {quizzes?.length === 0 && total > 0 && (
            <p className="px-9 py-3 text-sm text-muted-foreground">
              絞り込み条件に合うクイズはありません。
            </p>
          )}
          <div className="flex justify-end border-t px-3 py-2">
            <Link
              to={`?view=quiz-management&resource=${resource.uid}`}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              このResourceのクイズを管理
            </Link>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ResourceLearningOverview({
  filters,
}: {
  filters: QuizFilters;
}) {
  const { data: items, error } = useSWR<ResourceStatus[]>(
    "quiz-management-resource-overview",
    async () => {
      const [resources, quizStatuses] = await Promise.all([
        listStudyResources(),
        listCreatedQuizResources({ waitForRefresh: true }),
      ]);
      const quizByResource = new Map(
        quizStatuses.map((status) => [status.resource.uid, status]),
      );
      const learning = await Promise.all(
        resources.map((resource) =>
          getLearningProgress(resource.uid, { waitForRefresh: true }),
        ),
      );
      return resources.map((resource, index) => ({
        resource,
        quizzes: quizByResource.get(resource.uid),
        learning: learning[index],
      }));
    },
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  );
  const { data: brokenCount = 0, mutate: mutateBrokenCount } = useSWR(
    "quiz-management-broken-count",
    async () => {
      const references = await listBrokenQuizReferences();
      return new Set(references.map((item) => item.quiz_id)).size;
    },
  );

  if (error)
    return (
      <p className="px-3 py-2 text-sm text-destructive">
        {error instanceof Error
          ? error.message
          : "学習状況を取得できませんでした。"}
      </p>
    );
  if (!items) {
    return <Loading />;
  }
  if (items.length === 0) return null;

  return (
    <section className="border-y sm:border-x">
      <div className="flex items-center gap-2 border-b px-3 py-3">
        <h2 className="text-sm font-semibold">Resource別の学習状況</h2>
        {brokenCount > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-auto border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
              >
                <AlertTriangle className="size-4" />
                参照切れ {brokenCount}件
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>参照切れクイズ</DialogTitle>
                <DialogDescription>
                  元の単文を修復先へ付け替えるか、不要なクイズを削除してください。
                </DialogDescription>
              </DialogHeader>
              <BrokenQuizManager
                onCountChange={(count) =>
                  void mutateBrokenCount(count, { revalidate: false })
                }
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="sticky top-14 z-20 grid grid-cols-[minmax(0,1fr)_repeat(3,3.5rem)] items-center border-b bg-background/95 px-3 py-2 backdrop-blur sm:grid-cols-[minmax(0,1fr)_repeat(3,5rem)]">
        <span className="text-xs font-medium text-muted-foreground">
          Resource
        </span>
        <MetricHeader
          label="Coverage"
          description="対象単文のうち、必要な形式のクイズが用意されている割合です。"
        />
        <MetricHeader
          label="Attempt"
          description="用意されたクイズのうち、一度以上回答した割合です。"
        />
        <MetricHeader
          label="Accuracy"
          description="これまでに回答したクイズの正答率です。未回答の場合は—になります。"
        />
      </div>
      <div className="divide-y">
        {items.map((item) => (
          <ResourceDisclosure
            key={item.resource.uid}
            item={item}
            filters={filters}
          />
        ))}
      </div>
    </section>
  );
}
