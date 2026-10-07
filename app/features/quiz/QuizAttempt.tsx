import { useState } from "react";
import { useSWRConfig } from "swr";
import { invalidateGamification } from "~/features/gamification/invalidate";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/shared/components/ui/alert";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import { cn } from "~/shared/lib/utils";
import {
  ChainSentenceLink,
  RelationAnnotation,
  findTargetSentenceId,
} from "./QuizKnowledge";
import QuizPrompt from "./QuizPrompt";
import QuizReportButton from "./QuizReportButton";
import { type QuizChain, type ReadableQuiz, answerQuiz } from "./api";
import { quizOptionLabel } from "./relationPresentation";

type Props = {
  quiz: ReadableQuiz;
  className?: string;
  showStatement?: boolean;
  onAnswered?: (isCorrect: boolean) => void;
  completed?: boolean;
};

export default function QuizAttempt({
  quiz,
  className,
  showStatement = true,
  onAnswered,
  completed = false,
}: Props) {
  const { mutate } = useSWRConfig();
  const [selected, setSelected] = useState<string[]>([]);
  const [chain, setChain] = useState<QuizChain>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [reviewAgain, setReviewAgain] = useState(false);
  const answer = chain?.answers?.at(-1);
  const readOnly = completed && !answer && !reviewAgain;
  const quizType = chain?.quizzes[0]?.quiz_type;

  function toggle(optionId: string) {
    if (answer || readOnly) return;
    setSelected((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  }

  async function submit() {
    if (readOnly || isSubmitting) return;
    setIsSubmitting(true);
    setError(undefined);
    try {
      const answeredChain = await answerQuiz(quiz.quiz_id, selected);
      setChain(answeredChain);
      void invalidateGamification(mutate, { preserveData: true }).catch(
        () => undefined,
      );
      const answered = answeredChain.answers?.at(-1);
      if (answered) onAnswered?.(answered.is_correct);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "回答を送信できませんでした。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("space-y-3 border p-3", className)}>
      {showStatement && (
        <QuizPrompt
          quiz={quiz}
          renderSubject={(subject) => (
            <ChainSentenceLink
              chain={chain}
              sentenceId={chain && findTargetSentenceId(chain)}
            >
              {subject}
            </ChainSentenceLink>
          )}
        />
      )}
      <div className="space-y-1">
        {Object.entries(quiz.options).map(([optionId, option], index) => {
          const label = quizOptionLabel(quiz, option);
          const isSelected = selected.includes(optionId);
          const isCorrect = Boolean(answer) && quiz.correct.includes(optionId);
          const isSelectedWrong = Boolean(answer) && isSelected && !isCorrect;
          const className = `flex w-full items-start gap-2 border p-3 text-left text-base leading-relaxed ${
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
                <kbd className="shrink-0 font-mono text-muted-foreground">
                  {index + 1}
                </kbd>
                <span className="min-w-0 break-words">
                  <ChainSentenceLink chain={chain} sentenceId={optionId}>
                    {label}
                  </ChainSentenceLink>
                </span>
                {chain && quizType !== "pair2rel" && (
                  <RelationAnnotation chain={chain} sentenceId={optionId} />
                )}
              </span>
            </>
          );
          if (answer || readOnly) {
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
              data-quiz-option-index={index + 1}
              aria-label={label}
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
      {readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>回答済み</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setReviewAgain(true)}
          >
            もう一度解く
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <QuizReportButton quizId={quiz.quiz_id} />
        {!answer && !readOnly && (
          <Button
            type="button"
            size="sm"
            data-quiz-submit
            disabled={
              isSubmitting || (!quiz.no_correct_option && selected.length === 0)
            }
            onClick={() => void submit()}
          >
            {isSubmitting ? "送信中…" : "回答する"}
          </Button>
        )}
      </div>
    </div>
  );
}
