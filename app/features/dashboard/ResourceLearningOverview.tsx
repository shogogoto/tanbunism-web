import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  type QuizResourceStatus,
  type ResourceLearningStatus,
  type StudyResource,
  getLearningProgress,
  listCreatedQuizResources,
  listStudyResources,
} from "~/features/quiz/api";
import { Badge } from "~/shared/components/ui/badge";

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

export default function ResourceLearningOverview() {
  const [items, setItems] = useState<ResourceStatus[]>();
  const [error, setError] = useState<string>();

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
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "学習状況を取得できませんでした。",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <p className="px-3 py-2 text-sm text-destructive">{error}</p>;
  }
  if (!items) {
    return (
      <p className="px-3 py-2 text-sm text-muted-foreground">
        学習状況を読み込み中…
      </p>
    );
  }
  if (items.length === 0) return null;

  return (
    <section className="border-t">
      <h2 className="px-3 pb-2 pt-4 text-sm font-semibold">
        Resource別の学習状況
      </h2>
      <div className="divide-y">
        {items.map(({ resource, quizzes, learning }) => (
          <Link
            key={resource.uid}
            to={`?view=quiz-management&resource=${resource.uid}`}
            className="flex flex-col gap-2 px-3 py-3 hover:bg-muted/40 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{resource.name}</p>
              <Badge variant="secondary" className="mt-1">
                {quizzes?.total_quizzes ?? 0}問
              </Badge>
            </div>
            <Progress status={learning} />
          </Link>
        ))}
      </div>
    </section>
  );
}
