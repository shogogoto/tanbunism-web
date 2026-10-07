import { Badge } from "~/shared/components/ui/badge";
import type { ReadableQuiz } from "./api";

/** Additive API metadata; old cached quizzes may not include option_terms. */
type QuizWithOptionTerms = ReadableQuiz & {
  option_terms?: Record<string, string[]>;
};

export default function QuizOptionTerms({
  quiz,
  optionId,
}: {
  quiz: QuizWithOptionTerms;
  optionId: string;
}) {
  const terms =
    quiz.quiz_type === "rel2pair"
      ? (quiz.option_terms?.[optionId] ?? [])
      : quiz.quiz_type === "pair2rel"
        ? [
            ...(quiz.prompt?.subject_terms ?? []).map((term) => `A: ${term}`),
            ...(quiz.prompt?.object_terms ?? []).map((term) => `B: ${term}`),
          ]
        : [];
  if (!terms.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {[...new Set(terms)].map((term) => (
        <Badge
          key={term}
          variant="outline"
          className="border-sky-500/30 text-sm font-normal text-sky-700 dark:text-sky-300"
        >
          {term}
        </Badge>
      ))}
    </span>
  );
}
