import { Award } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Card, CardContent } from "~/shared/components/ui/card";
import { Highlight } from "./Highlight";

type Props = {
  uid: string;
  sentence: string;
  termNames?: string[];
  score: number;
  query?: string;
  state?: unknown;
  metadata?: ReactNode;
};

export default function KnowledgeCard({
  uid,
  sentence,
  termNames,
  score,
  query = "",
  state,
  metadata,
}: Props) {
  return (
    <Card className="w-full max-w-3xl border-l-4 border-l-blue-500 transition-colors hover:bg-muted/40">
      <CardContent className="space-y-3 p-4">
        <Link to={`/tanbun/${uid}`} state={state} className="block space-y-2">
          <span className="sr-only">知識:</span>
          {termNames?.length ? (
            <p className="font-semibold">
              {termNames.map((name) => (
                <span key={name} className="mr-2">
                  <Highlight text={name} query={query} />
                </span>
              ))}
            </p>
          ) : null}
          {sentence !== "<<<not defined>>>" && (
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              <Highlight text={sentence} query={query} />
            </p>
          )}
        </Link>
        <div className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {metadata}
          </div>
          <KnowledgeScore score={score} />
        </div>
      </CardContent>
    </Card>
  );
}

export function KnowledgeScore({ score }: { score: number }) {
  return (
    <span
      className="flex shrink-0 items-center gap-1 text-blue-700 dark:text-blue-300"
      aria-label={`スコア: ${score}`}
      title={`スコア: ${score}`}
    >
      <Award className="size-3.5" aria-hidden="true" />
      <span className="font-mono tabular-nums">{score}</span>
    </span>
  );
}
