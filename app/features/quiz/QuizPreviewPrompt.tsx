import type { ComponentProps, ReactNode } from "react";
import { useTanbunPreview } from "~/features/tanbun/detail/Preview";
import QuizPrompt from "./QuizPrompt";
import { quizOptionLabel } from "./relationPresentation";

/** Shared quiz-to-detail navigation; keeps the answering screen mounted. */
export default function QuizPreviewPrompt({
  showCorrectAnswer = false,
  ...props
}: Omit<ComponentProps<typeof QuizPrompt>, "renderSubject" | "renderObject"> & {
  showCorrectAnswer?: boolean;
}) {
  const { openPreview, preview } = useTanbunPreview();
  const { quiz } = props;
  function sentenceLink(
    content: ReactNode,
    role: "target" | "correct",
    sentence?: string,
  ) {
    return (
      <button
        type="button"
        className="text-left hover:text-primary hover:underline"
        title="単文詳細を開く"
        onClick={() => openPreview({ quizId: quiz.quiz_id, role, sentence })}
      >
        {content}
      </button>
    );
  }
  const sentenceAnswer =
    quiz.quiz_type === "term2sent" || quiz.quiz_type === "rel2pair";
  return (
    <>
      {preview}
      <QuizPrompt
        {...props}
        renderSubject={(subject) => sentenceLink(subject, "target")}
        renderObject={(object) => sentenceLink(object, "correct", object)}
      />
      {showCorrectAnswer && (
        <p className="text-sm text-emerald-500">
          正解:{" "}
          {quiz.correct.map((id, index) => {
            const label = quizOptionLabel(quiz, quiz.options[id]);
            return (
              <span key={id}>
                {index > 0 && "・"}
                {sentenceAnswer
                  ? sentenceLink(label, "correct", quiz.options[id])
                  : label}
              </span>
            );
          })}
        </p>
      )}
    </>
  );
}
