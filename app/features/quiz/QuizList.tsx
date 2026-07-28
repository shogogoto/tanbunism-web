import { useEffect, useState } from "react";
import { Link } from "react-router";
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
import { type ReadableQuiz, deleteQuiz, listCreatedQuizzes } from "./api";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; quizzes: ReadableQuiz[] }
  | { status: "error"; message: string };

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
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    listCreatedQuizzes()
      .then((quizzes) => {
        if (active) setLoadState({ status: "loaded", quizzes });
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
  }, []);

  async function handleDelete(quizId: string) {
    await deleteQuiz(quizId);
    setLoadState((current) =>
      current.status === "loaded"
        ? {
            status: "loaded",
            quizzes: current.quizzes.filter((quiz) => quiz.quiz_id !== quizId),
          }
        : current,
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">作成したクイズ</h1>
          <p className="text-sm text-muted-foreground">
            問題・選択肢・正解を確認し、不要なクイズを整理できます。
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
      {loadState.status === "loaded" && loadState.quizzes.length === 0 && (
        <p className="border p-4 text-sm text-muted-foreground">
          作成したクイズはありません。
        </p>
      )}
      {loadState.status === "loaded" &&
        loadState.quizzes.map((quiz) => (
          <QuizCard key={quiz.quiz_id} quiz={quiz} onDelete={handleDelete} />
        ))}
    </div>
  );
}
