import type { ReactNode } from "react";
import { Badge } from "~/shared/components/ui/badge";
import { cn } from "~/shared/lib/utils";
import type { ReadableQuiz } from "./api";
import { relationQuestion } from "./relationPresentation";

type PromptQuiz = ReadableQuiz & {
  prompt?: ReadableQuiz["prompt"];
  quiz_type?: ReadableQuiz["quiz_type"];
};

const presentation = {
  sent2term: {
    label: "単文 → 用語",
    instruction: "この単文を表す用語を選ぶ",
    badge:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  term2sent: {
    label: "用語 → 単文",
    instruction: "この用語を説明する単文を選ぶ",
    badge: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  rel2pair: {
    label: "関係 → 単文",
    instruction: "Aとの関係から単文を選ぶ",
    badge:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  pair2rel: {
    label: "単文組 → 関係",
    instruction: "Aから見たBとの関係は？",
    badge:
      "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
} as const;

type Props = {
  quiz: PromptQuiz;
  className?: string;
  compact?: boolean;
  showTypeBadge?: boolean;
  renderSubject?: (subject: string) => ReactNode;
  renderObject?: (object: string) => ReactNode;
};

export function QuizTypeBadge({
  quizType,
  className,
}: {
  quizType: NonNullable<ReadableQuiz["quiz_type"]>;
  className?: string;
}) {
  const style = presentation[quizType];
  return (
    <Badge variant="outline" className={cn("shrink-0", style.badge, className)}>
      {style.label}
    </Badge>
  );
}

function TermNames({ terms = [] }: { terms?: string[] }) {
  if (terms.length === 0) return null;
  return (
    <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
      {terms.map((term) => (
        <Badge
          key={term}
          variant="secondary"
          className="px-1.5 py-0 text-sm font-medium"
        >
          {term}
        </Badge>
      ))}
    </span>
  );
}

function RelationQuestion({ quiz }: { quiz: PromptQuiz }) {
  const prompt = quiz.prompt;
  if (!prompt) return null;
  if (quiz.quiz_type === "pair2rel") return null;
  return (
    <p className="text-sm font-medium" aria-label="問う関係">
      {relationQuestion(prompt.relations)}
    </p>
  );
}

export default function QuizPrompt({
  quiz,
  className,
  compact = false,
  showTypeBadge = true,
  renderSubject = (subject) => subject,
  renderObject = (object) => object,
}: Props) {
  const prompt = quiz.prompt;
  const quizType = quiz.quiz_type;

  // Keep deployments compatible while the backend and cached responses roll over.
  if (!prompt || !quizType || !(quizType in presentation)) {
    return (
      <p className={cn("whitespace-pre-line text-sm font-medium", className)}>
        {renderSubject(quiz.statement)}
      </p>
    );
  }

  const style = presentation[quizType];
  const isRelation = quizType === "rel2pair" || quizType === "pair2rel";

  return (
    <div
      className={cn("min-w-0", compact ? "space-y-1" : "space-y-2", className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        {showTypeBadge && <QuizTypeBadge quizType={quizType} />}
        <span className="text-xs text-muted-foreground">
          {style.instruction}
        </span>
      </div>
      {isRelation ? (
        <div className={cn("space-y-1.5", !compact && "rounded border p-2")}>
          <p
            className={cn(
              "whitespace-pre-wrap leading-relaxed",
              compact ? "text-sm" : "text-base md:text-lg",
            )}
          >
            <span className="mr-2 font-mono text-xs text-muted-foreground">
              A
            </span>
            <span className="font-medium">{renderSubject(prompt.subject)}</span>
            <TermNames terms={prompt.subject_terms} />
          </p>
          {prompt.object && (
            <p
              className={cn(
                "whitespace-pre-wrap leading-relaxed",
                compact ? "text-sm" : "text-base md:text-lg",
              )}
            >
              <span className="mr-2 font-mono text-xs text-muted-foreground">
                B
              </span>
              <span className="font-medium">{renderObject(prompt.object)}</span>
              <TermNames terms={prompt.object_terms} />
            </p>
          )}
          <RelationQuestion quiz={quiz} />
        </div>
      ) : (
        <p
          className={cn(
            "whitespace-pre-wrap font-semibold leading-relaxed",
            compact ? "text-sm" : "text-base md:text-lg",
          )}
        >
          {renderSubject(prompt.subject)}
        </p>
      )}
    </div>
  );
}
