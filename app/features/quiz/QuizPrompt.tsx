import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "~/shared/components/ui/badge";
import { cn } from "~/shared/lib/utils";
import type { ReadableQuiz } from "./api";

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
    instruction: "関係先にある単文を選ぶ",
    badge:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  pair2rel: {
    label: "単文組 → 関係",
    instruction: "2つの単文を結ぶ関係を選ぶ",
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
          className="px-1.5 py-0 text-[11px] font-medium"
        >
          {term}
        </Badge>
      ))}
    </span>
  );
}

function RelationPath({ quiz }: { quiz: PromptQuiz }) {
  const prompt = quiz.prompt;
  if (!prompt) return null;
  const relations = prompt.relations ?? [];
  const destination = quiz.quiz_type === "pair2rel" ? "B" : "?";

  return (
    <div
      className="flex flex-wrap items-center gap-1 font-mono text-xs font-medium"
      aria-label="関係の経路"
    >
      <span className="rounded bg-muted px-1.5 py-0.5">A</span>
      {relations.map((relation, index) => (
        <span
          // The relation order itself is part of the prompt, so its index is stable.
          key={`${relation.name ?? "unknown"}-${index}`}
          className="contents"
        >
          {!relation.is_forward && (
            <ArrowLeft
              className="size-5 shrink-0 text-foreground"
              aria-label="左向き"
            />
          )}
          <span className="rounded-md border bg-background px-2 py-0.5 text-foreground shadow-sm">
            {relation.name ?? "?"}
          </span>
          {relation.is_forward && (
            <ArrowRight
              className="size-5 shrink-0 text-foreground"
              aria-label="右向き"
            />
          )}
          {index < relations.length - 1 && (
            <span className="rounded bg-muted px-1.5 py-0.5">…</span>
          )}
        </span>
      ))}
      <span className="rounded bg-muted px-1.5 py-0.5">{destination}</span>
    </div>
  );
}

export default function QuizPrompt({
  quiz,
  className,
  compact = false,
  showTypeBadge = true,
  renderSubject = (subject) => subject,
}: Props) {
  const prompt = quiz.prompt;
  const quizType = quiz.quiz_type;

  // Keep deployments compatible while the backend and cached responses roll over.
  if (!prompt || !quizType || !(quizType in presentation)) {
    return (
      <p className={cn("whitespace-pre-line text-sm font-medium", className)}>
        {quiz.statement}
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
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            <span className="mr-2 font-mono text-xs text-muted-foreground">
              A
            </span>
            <span className="font-medium">{renderSubject(prompt.subject)}</span>
            <TermNames terms={prompt.subject_terms} />
          </p>
          {prompt.object && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              <span className="mr-2 font-mono text-xs text-muted-foreground">
                B
              </span>
              <span className="font-medium">{prompt.object}</span>
              <TermNames terms={prompt.object_terms} />
            </p>
          )}
          <RelationPath quiz={quiz} />
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed">
          {renderSubject(prompt.subject)}
        </p>
      )}
    </div>
  );
}
