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
  type QuizResourceStatus,
  type ReadableQuiz,
  type ResourceLearningStatus,
  deleteQuiz,
  getLearningProgress,
  listCreatedQuizResources,
  listCreatedQuizzes,
} from "./api";

type LoadState =
  | { status: "loading" }
  | {
      status: "loaded";
      resources: QuizResourceStatus[];
      learningByResource: Map<string, ResourceLearningStatus>;
      quizzes?: ReadableQuiz[];
    }
  | { status: "error"; message: string };

const quizTypeLabels = {
  term2sent: "用語→単文",
  sent2term: "単文→用語",
  rel2pair: "関係→ペア",
  pair2rel: "ペア→関係",
} as const;

function Percentage({ value }: { value: number }) {
  return <>{Math.round(value * 100)}%</>;
}

function LearningProgress({ status }: { status: ResourceLearningStatus }) {
  return (
    <div className="space-y-3 border-t pt-3">
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="font-semibold">
            <Percentage value={status.overall_coverage} />
          </div>
          <div className="text-muted-foreground">Coverage</div>
        </div>
        <div>
          <div className="font-semibold">
            <Percentage value={status.overall_attempt_rate} />
          </div>
          <div className="text-muted-foreground">Attempt</div>
        </div>
        <div>
          <div className="font-semibold">
            <Percentage value={status.overall_accuracy} />
          </div>
          <div className="text-muted-foreground">Accuracy</div>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        {Object.entries(status.by_quiz_type).map(([type, learning]) => (
          <div key={type} className="grid grid-cols-[1fr_repeat(3,3rem)] gap-2">
            <span>
              {quizTypeLabels[type as keyof typeof quizTypeLabels] ?? type}
            </span>
            <span title="Coverage">
              <Percentage value={learning.coverage.ratio} />
            </span>
            <span title="Attempt">
              <Percentage value={learning.attempt_rate.ratio} />
            </span>
            <span title="Accuracy">
              <Percentage value={learning.performance.accuracy} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceCard({
  status,
  learning,
}: {
  status: QuizResourceStatus;
  learning?: ResourceLearningStatus;
}) {
  const counts = Object.entries(status.quiz_counts ?? {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{status.resource.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {status.total_quizzes}問作成済み
            </p>
          </div>
          <Button asChild size="sm">
            <Link to={`?resource=${status.resource.uid}`}>クイズを見る</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {counts.map(([type, count]) => (
            <Badge key={type} variant="secondary">
              {quizTypeLabels[type as keyof typeof quizTypeLabels] ?? type}{" "}
              {count}
            </Badge>
          ))}
        </div>
        {learning && <LearningProgress status={learning} />}
        <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>
            最終作成: {new Date(status.last_created_at).toLocaleString("ja-JP")}
          </span>
          <Link
            className="underline underline-offset-4"
            to={`/resource/${status.resource.uid}`}
          >
            単文を見る
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function QuizCard({
  quiz,
  onDelete,
}: {
  quiz: ReadableQuiz;
  onDelete: (quizId: string) => Promise<void>;
}) {
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
        <CardTitle className="text-base leading-relaxed">
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
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    Promise.all([
      listCreatedQuizResources(),
      resourceId
        ? listCreatedQuizzes(resourceId, sentenceId)
        : Promise.resolve(undefined),
    ])
      .then(async ([resources, quizzes]) => {
        const learning = await Promise.all(
          resources.map(
            async ({ resource }) =>
              [resource.uid, await getLearningProgress(resource.uid)] as const,
          ),
        );
        if (active) {
          setLoadState({
            status: "loaded",
            resources,
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
  }, [resourceId, sentenceId]);

  async function handleDelete(quizId: string) {
    await deleteQuiz(quizId);
    setLoadState((current) =>
      current.status === "loaded"
        ? {
            ...current,
            quizzes: current.quizzes?.filter((quiz) => quiz.quiz_id !== quizId),
          }
        : current,
    );
  }

  const selectedResource =
    loadState.status === "loaded"
      ? loadState.resources.find(
          (resource) => resource.resource.uid === resourceId,
        )
      : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {selectedResource?.resource.name ?? "作成したクイズ"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {resourceId
              ? sentenceId
                ? "この単文から作成した問題・選択肢・正解を確認できます。"
                : "このResourceから作成した問題・選択肢・正解を確認できます。"
              : "Resourceを選んで、単文から作成されたクイズを確認します。"}
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
        <div className="space-y-3">
          {loadState.resources.map((resource) => (
            <ResourceCard
              key={resource.resource.uid}
              status={resource}
              learning={loadState.learningByResource.get(resource.resource.uid)}
            />
          ))}
        </div>
      )}
      {loadState.status === "loaded" &&
        !resourceId &&
        loadState.resources.length === 0 && (
          <p className="border p-4 text-sm text-muted-foreground">
            作成したクイズはありません。
          </p>
        )}
      {loadState.status === "loaded" &&
        resourceId &&
        loadState.quizzes?.length === 0 && (
          <p className="border p-4 text-sm text-muted-foreground">
            このResourceから作成したクイズはありません。
          </p>
        )}
      {loadState.status === "loaded" && resourceId && (
        <Button asChild variant="ghost" size="sm">
          <Link to="/quiz/list">← Resource一覧へ</Link>
        </Button>
      )}
      {loadState.status === "loaded" &&
        loadState.quizzes?.map((quiz) => (
          <QuizCard key={quiz.quiz_id} quiz={quiz} onDelete={handleDelete} />
        ))}
    </div>
  );
}
