import { type ReactNode, useRef, useState } from "react";
import { toast } from "sonner";
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
import { useQuizOptionOrder } from "./optionOrder";
import { quizOptionLabel } from "./relationPresentation";

type Props = {
  quiz: ReadableQuiz;
  className?: string;
  showStatement?: boolean;
  onAnswered?: (isCorrect: boolean) => void;
  completed?: boolean;
  compactMobile?: boolean;
  enterToSubmit?: boolean;
  keyboardHint?: string | null;
  actionInfo?: ReactNode;
  disabled?: boolean;
  onSubmittingChange?: (submitting: boolean) => void;
  canSubmit?: () => boolean;
  /** Game turns confirm locally; history and correctness arrive only at turn end. */
  onConfirm?: (selected: string[]) => void;
  allowReport?: boolean;
};

export default function QuizAttempt({
  quiz,
  className,
  showStatement = true,
  onAnswered,
  completed = false,
  compactMobile = false,
  enterToSubmit = false,
  keyboardHint,
  actionInfo,
  disabled = false,
  onSubmittingChange,
  canSubmit,
  onConfirm,
  allowReport = true,
}: Props) {
  const { mutate } = useSWRConfig();
  const optionOrder = useQuizOptionOrder(quiz);
  const [selected, setSelected] = useState<string[]>([]);
  const [chain, setChain] = useState<QuizChain>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [reviewAgain, setReviewAgain] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);
  const answer = chain?.answers?.at(-1);
  const readOnly = completed && !answer && !reviewAgain;
  const quizType = chain?.quizzes[0]?.quiz_type;

  function toggle(optionId: string) {
    if (answer || readOnly || confirmed || disabled || isSubmitting) return;
    setSelected((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId],
    );
  }

  async function submit() {
    if (
      readOnly ||
      isSubmitting ||
      disabled ||
      answer ||
      confirmed ||
      (canSubmit && !canSubmit())
    )
      return;
    if (onConfirm) {
      setConfirmed(true);
      onConfirm([...selected]);
      return;
    }
    setIsSubmitting(true);
    onSubmittingChange?.(true);
    setError(undefined);
    try {
      const answeredChain = await answerQuiz(quiz.quiz_id, selected);
      setChain(answeredChain);
      if (answeredChain.step_recovery_awarded)
        toast.success(
          "今日の復習クイズ20問達成！歩数回復薬を1個獲得しました。",
        );
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
      onSubmittingChange?.(false);
    }
  }

  return (
    <div
      className={cn(
        "space-y-3 border p-3",
        compactMobile && "space-y-2 sm:space-y-3",
        className,
      )}
    >
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
      <div ref={optionsRef} className="space-y-1">
        {optionOrder.map((optionId, index) => {
          const option = quiz.options[optionId];
          const label = quizOptionLabel(quiz, option);
          const isSelected = selected.includes(optionId);
          const isCorrect = Boolean(answer) && quiz.correct.includes(optionId);
          const isSelectedWrong = Boolean(answer) && isSelected && !isCorrect;
          const className = `flex w-full items-start gap-2 border ${compactMobile ? "min-h-11 px-3 py-2 sm:p-3" : "p-3"} text-left text-base leading-relaxed ${
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
          if (answer || readOnly || confirmed) {
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
              disabled={disabled || isSubmitting}
              onClick={() => toggle(optionId)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown" && event.key !== "ArrowUp")
                  return;
                const options = Array.from(
                  optionsRef.current?.querySelectorAll<HTMLButtonElement>(
                    "button[data-quiz-option-index]:not(:disabled)",
                  ) ?? [],
                );
                if (!options.length) return;
                event.preventDefault();
                const currentIndex = options.indexOf(event.currentTarget);
                const direction = event.key === "ArrowDown" ? 1 : -1;
                options[
                  (currentIndex + direction + options.length) % options.length
                ]?.focus();
              }}
              className={`${className} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
            >
              {content}
            </button>
          );
        })}
      </div>
      {keyboardHint !== null && (
        <p className="hidden text-xs text-muted-foreground sm:block">
          {keyboardHint ??
            (enterToSubmit
              ? "↑↓ 選択肢を移動 · Spaceで選択/解除 · Enterで確定"
              : "↑↓ 選択肢を移動 · Enter/Space で選択")}
        </p>
      )}
      {answer && (
        <Alert>
          <AlertTitle>
            {answer.is_correct ? "正解です" : "不正解です"}
          </AlertTitle>
          <AlertDescription
            className={compactMobile ? "sr-only sm:not-sr-only" : undefined}
          >
            回答を記録しました。問題文と選択肢から関連する単文を開けます。
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        {allowReport && (
          <QuizReportButton
            quizId={quiz.quiz_id}
            compactMobile={compactMobile}
          />
        )}
        {actionInfo && (
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            {actionInfo}
          </div>
        )}
        {readOnly && (
          <>
            {!actionInfo && <p className="flex-1 text-sm">回答済み</p>}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setReviewAgain(true)}
            >
              もう一度解く
            </Button>
          </>
        )}
        {confirmed && <p className="text-sm">回答確定</p>}
        {!answer && !readOnly && !confirmed && (
          <Button
            type="button"
            size="sm"
            data-quiz-submit
            disabled={
              disabled ||
              isSubmitting ||
              (!quiz.no_correct_option && selected.length === 0)
            }
            onClick={() => void submit()}
          >
            {isSubmitting ? "送信中…" : onConfirm ? "回答を確定" : "回答する"}
          </Button>
        )}
      </div>
    </div>
  );
}
