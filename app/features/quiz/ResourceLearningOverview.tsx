import { AlertTriangle, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
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
  if (!status) return <span className="text-muted-foreground">—</span>;
  const attempts = Object.values(status.by_quiz_type).reduce(
    (total, item) => total + item.performance.attempts,
    0,
  );
  return (
    <div className="flex gap-3 text-xs tabular-nums sm:gap-5">
      <span title="対象単文にクイズを用意した割合">
        Coverage{" "}
        <b>
          <Percentage value={status.overall_coverage} />
        </b>
      </span>
      <span title="用意したクイズに回答した割合">
        Attempt{" "}
        <b>
          <Percentage value={status.overall_attempt_rate} />
        </b>
      </span>
      <span title="回答の正答率">
        Accuracy{" "}
        <b>
          {attempts === 0 ? (
            "—"
          ) : (
            <Percentage value={status.overall_accuracy} />
          )}
        </b>
      </span>
    </div>
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
  const [quizzes, setQuizzes] = useState<ManagedQuiz[]>();
  const [error, setError] = useState<string>();
  const total = status?.total_quizzes ?? 0;

  useEffect(() => {
    if (!open || total === 0) return;
    let active = true;
    setQuizzes(undefined);
    setError(undefined);
    searchCreatedQuizzes({
      resource_id: resource.uid,
      ...toQuizSearchParams(filters),
      page: 1,
      size: 100,
    })
      .then((result) => {
        if (active) setQuizzes(result.data);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "クイズを取得できませんでした。",
        );
      });
    return () => {
      active = false;
    };
  }, [filters, open, resource.uid, total]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group flex w-full flex-col gap-2 px-3 py-3 text-left hover:bg-muted/40 sm:flex-row sm:items-center"
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
          {open && total > 0 && !quizzes && !error && (
            <p className="px-9 py-3 text-sm text-muted-foreground">
              関連クイズを読み込み中…
            </p>
          )}
          {error && (
            <p className="px-9 py-3 text-sm text-destructive">{error}</p>
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
  const [items, setItems] = useState<ResourceStatus[]>();
  const [error, setError] = useState<string>();
  const [brokenCount, setBrokenCount] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([listStudyResources(), listCreatedQuizResources()])
      .then(async ([resources, quizStatuses]) => {
        const quizByResource = new Map(
          quizStatuses.map((status) => [status.resource.uid, status]),
        );
        const learning = await Promise.all(
          resources.map((resource) => getLearningProgress(resource.uid)),
        );
        if (!active) return;
        setItems(
          resources.map((resource, index) => ({
            resource,
            quizzes: quizByResource.get(resource.uid),
            learning: learning[index],
          })),
        );
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "学習状況を取得できませんでした。",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listBrokenQuizReferences()
      .then((references) => {
        if (active)
          setBrokenCount(new Set(references.map((item) => item.quiz_id)).size);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (error)
    return <p className="px-3 py-2 text-sm text-destructive">{error}</p>;
  if (!items) {
    return (
      <p className="px-3 py-2 text-sm text-muted-foreground">
        学習状況を読み込み中…
      </p>
    );
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
              <BrokenQuizManager onCountChange={setBrokenCount} />
            </DialogContent>
          </Dialog>
        )}
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
