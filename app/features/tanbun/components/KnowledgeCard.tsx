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
  compact?: boolean;
  scorePosition?: "start" | "end" | "none";
  hotkeyItem?: boolean;
};

export default function KnowledgeCard({
  uid,
  sentence,
  termNames,
  score,
  query = "",
  state,
  metadata,
  compact = false,
  scorePosition = "end",
  hotkeyItem = false,
}: Props) {
  return (
    <Card
      className={`w-full max-w-3xl border-l-blue-500 transition-colors hover:bg-muted/40 ${
        compact ? "gap-1 border-l-2 py-0 shadow-none" : "border-l-4"
      }`}
    >
      <CardContent className={compact ? "space-y-1.5 p-2" : "space-y-3 p-4"}>
        <Link
          to={`/tanbun/${uid}`}
          state={state}
          data-hotkey-item={hotkeyItem || undefined}
          className={`block outline-none data-[hotkey-active=true]:rounded-sm data-[hotkey-active=true]:bg-accent/70 data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-primary ${compact ? "space-y-1" : "space-y-2"}`}
        >
          <span className="sr-only">知識:</span>
          {termNames?.length ? (
            <p className={compact ? "text-sm font-semibold" : "font-semibold"}>
              {termNames.map((name) => (
                <span
                  key={name}
                  className="mr-1.5 inline-block rounded-sm bg-blue-500/12 px-1.5 py-0.5 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300"
                >
                  <Highlight text={name} query={query} />
                </span>
              ))}
            </p>
          ) : null}
          {sentence !== "<<<not defined>>>" && (
            <p
              className={`whitespace-pre-wrap break-words ${
                compact ? "text-sm leading-snug" : "leading-relaxed"
              }`}
            >
              <Highlight text={sentence} query={query} />
            </p>
          )}
        </Link>
        <div
          className={`flex min-w-0 items-center text-xs text-muted-foreground ${
            compact ? "gap-2" : "gap-3"
          }`}
        >
          {scorePosition === "start" && <KnowledgeScore score={score} />}
          <div
            className={`flex min-w-0 flex-1 items-center ${
              compact ? "gap-2" : "gap-3"
            }`}
          >
            {metadata}
          </div>
          {scorePosition === "end" && <KnowledgeScore score={score} />}
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
