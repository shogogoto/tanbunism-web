import { useState } from "react";
import { Link } from "react-router";
import { createSentenceQuiz } from "~/features/quiz/api";
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
  const [error, setError] = useState<string>();
  const status = sentenceQuizStatuses?.get(sentenceId);

  async function create(quizType: QuizType) {
    setIsCreating(true);
    setError(undefined);
    try {
      await createSentenceQuiz(sentenceId, quizType);
      await refreshSentenceQuizStatuses?.();
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
    <span className="ml-2 inline-flex items-center gap-1 align-middle">
      {status && (
        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Link to={`/quiz/list?resource=${rootId}&sentence=${sentenceId}`}>
            クイズ {status.total_quizzes}
          </Link>
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
  );
}
