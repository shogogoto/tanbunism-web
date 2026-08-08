import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/shared/components/ui/alert";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import {
  ChainSentenceLink,
  RelationAnnotation,
  findTargetSentenceId,
} from "./QuizKnowledge";
import { type QuizChain, type ReadableQuiz, answerQuiz } from "./api";

export default function QuizAttempt({ quiz }: { quiz: ReadableQuiz }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [chain, setChain] = useState<QuizChain>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const answer = chain?.answers?.at(-1);
  const quizType = chain?.quizzes[0]?.quiz_type;

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
      <p className="whitespace-pre-line text-sm font-medium">
        <ChainSentenceLink
          chain={chain}
          sentenceId={chain && findTargetSentenceId(chain)}
        >
          {quiz.statement}
        </ChainSentenceLink>
      </p>
      <div className="space-y-1">
        {Object.entries(quiz.options).map(([optionId, option]) => {
          const isSelected = selected.includes(optionId);
          const isCorrect = Boolean(answer) && quiz.correct.includes(optionId);
          const isSelectedWrong = Boolean(answer) && isSelected && !isCorrect;
          const className = `flex w-full items-start gap-2 border p-2 text-left text-xs ${
            isCorrect
              ? "border-green-600 bg-green-500/10"
              : isSelectedWrong
                ? "border-destructive bg-destructive/10"
                : isSelected
                  ? "border-primary bg-primary/10"
                  : "hover:bg-muted"
          }`;
          const content = (
            <>
              {isCorrect && <Badge variant="secondary">正解</Badge>}
              {isSelectedWrong && (
                <Badge variant="destructive">あなたの回答</Badge>
              )}
              <span className="flex min-w-0 items-baseline gap-2">
                <ChainSentenceLink chain={chain} sentenceId={optionId}>
                  {option}
                </ChainSentenceLink>
                {chain && quizType !== "pair2rel" && (
                  <RelationAnnotation chain={chain} sentenceId={optionId} />
                )}
              </span>
            </>
          );
          if (answer) {
            return (
              <div key={optionId} className={className}>
                {content}
              </div>
            );
          }
          return (
            <button
              key={optionId}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(optionId)}
              className={className}
            >
              {content}
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
            回答を記録しました。問題文と選択肢から関連する単文を開けます。
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
    </div>
  );
}
