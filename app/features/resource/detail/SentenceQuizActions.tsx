import { useState } from "react";
import { Link } from "react-router";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import {
  type ReadableQuiz,
  createSentenceQuiz,
  listCreatedQuizzes,
} from "~/features/quiz/api";
import { Button } from "~/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/shared/components/ui/dropdown-menu";
import { useResourceDetail } from "./Context";

type QuizType = "sent2term" | "term2sent";

export default function SentenceQuizActions({
  sentenceId,
}: {
  sentenceId: string;
}) {
  const { rootId, sentenceQuizStatuses, refreshSentenceQuizStatuses } =
    useResourceDetail();
  const [isCreating, setIsCreating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<ReadableQuiz[]>();
  const [error, setError] = useState<string>();
  const status = sentenceQuizStatuses?.get(sentenceId);

  async function loadQuizzes() {
    setIsLoading(true);
    setError(undefined);
    try {
      setQuizzes(await listCreatedQuizzes(rootId, sentenceId));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "クイズを取得できませんでした。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleQuizzes() {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    setIsExpanded(true);
    await loadQuizzes();
  }

  async function create(quizType: QuizType) {
    setIsCreating(true);
    setError(undefined);
    try {
      await createSentenceQuiz(sentenceId, quizType);
      await refreshSentenceQuizStatuses?.();
      if (isExpanded) await loadQuizzes();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "クイズを作成できませんでした。",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <span className="ml-2 inline-flex items-center gap-1 align-middle">
        {status && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            aria-expanded={isExpanded}
            onClick={() => void toggleQuizzes()}
          >
            クイズ {status.total_quizzes}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isCreating}
            >
              {isCreating ? "作成中…" : "＋ クイズ"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => void create("term2sent")}>
              用語から単文を当てる
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void create("sent2term")}>
              単文から用語を当てる
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        )}
      </span>
      {isExpanded && (
        <div className="my-2 ml-6 space-y-2 border-l-2 pl-3">
          {isLoading && (
            <p className="text-xs text-muted-foreground">クイズを読込中…</p>
          )}
          {!isLoading &&
            quizzes?.map((quiz) => (
              <QuizAttempt key={quiz.quiz_id} quiz={quiz} />
            ))}
          {!isLoading && quizzes?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              作成したクイズはありません。
            </p>
          )}
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link to={`/quiz/list?resource=${rootId}&sentence=${sentenceId}`}>
              一覧で管理
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}
