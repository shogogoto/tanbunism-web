import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/shared/components/ui/alert";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import QuizChainReview from "./QuizChainReview";
import { type QuizChain, type ReadableQuiz, answerQuiz } from "./api";

export default function QuizAttempt({ quiz }: { quiz: ReadableQuiz }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [chain, setChain] = useState<QuizChain>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const answer = chain?.answers?.at(-1);

  function toggle(optionId: string) {
    if (answer) return;
    setSelected((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  }

  async function submit() {
    setIsSubmitting(true);
    setError(undefined);
    try {
      setChain(await answerQuiz(quiz.quiz_id, selected));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "回答を送信できませんでした。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 border p-3">
      <p className="text-sm font-medium">{quiz.statement}</p>
      <div className="space-y-1">
        {Object.entries(quiz.options).map(([optionId, option]) => {
          const isSelected = selected.includes(optionId);
          return (
            <button
              key={optionId}
              type="button"
              aria-pressed={isSelected}
              disabled={Boolean(answer)}
              onClick={() => toggle(optionId)}
              className={`flex w-full items-start gap-2 border p-2 text-left text-xs ${
                isSelected ? "border-primary bg-primary/10" : "hover:bg-muted"
              }`}
            >
              {answer && quiz.correct.includes(optionId) && (
                <Badge variant="secondary">正解</Badge>
              )}
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {answer && (
        <Alert>
          <AlertTitle>
            {answer.is_correct ? "正解です" : "不正解です"}
          </AlertTitle>
          <AlertDescription>
            回答を記録しました。関連する単文を下で確認できます。
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {!answer && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={
              isSubmitting || (!quiz.no_correct_option && selected.length === 0)
            }
            onClick={() => void submit()}
          >
            {isSubmitting ? "送信中…" : "回答する"}
          </Button>
        </div>
      )}
      {chain && <QuizChainReview chain={chain} />}
    </div>
  );
}
