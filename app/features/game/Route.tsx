import { MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "~/shared/components/ui/button";
import PathTerms from "./PathTerms";
import type { PathKnowledge } from "./api";
import type { Run } from "./domain";

const phaseLabels: Record<Run["phase"], string> = {
  path: "探索中",
  battle: "戦闘中",
  rest: "休憩中",
  cleared: "攻略完了",
  defeated: "冒険失敗",
};

/** Ordered visited knowledge, never the recommendation order or event move count. */
export default function DungeonRoute({
  run,
  knowledge,
  onOpen,
}: {
  run: Run;
  knowledge: PathKnowledge[];
  onOpen: (sentenceId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sentences = new Map(knowledge.map((item) => [item.uid, item]));
  const hiddenCount = expanded ? 0 : Math.max(0, run.readIds.length - 3);
  const steps = run.readIds.slice(hiddenCount);
  return (
    <section
      aria-label="ダンジョンの進路"
      className="rounded-xl border p-3 sm:p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="size-4 text-primary" />
          現在地 · {run.readIds.length ? `第${run.readIds.length}地点` : "入口"}
        </h3>
        <span className="text-xs text-muted-foreground">
          {phaseLabels[run.phase]}
        </span>
      </div>
      <ol className="ml-2 border-l border-primary/30 pl-5 space-y-3">
        <li
          aria-current={!run.readIds.length ? "step" : undefined}
          className="relative text-xs text-muted-foreground"
        >
          <span
            aria-hidden
            className="absolute -left-[25px] top-1 size-2 rounded-full bg-muted-foreground"
          />
          入口
        </li>
        {hiddenCount > 0 && (
          <li>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(true)}>
              通った{hiddenCount}地点を表示
            </Button>
          </li>
        )}
        {steps.map((sentenceId, index) => {
          const position = hiddenCount + index + 1;
          const current = position === run.readIds.length;
          return (
            <li
              key={`${position}:${sentenceId}`}
              aria-current={current ? "step" : undefined}
              className="relative min-w-0"
            >
              <span
                aria-hidden
                className={`absolute -left-[27px] top-3 size-3 rounded-full border-2 ${current ? "border-primary bg-primary ring-4 ring-primary/15" : "border-primary/50 bg-background"}`}
              />
              <button
                type="button"
                onClick={() => onOpen(sentenceId)}
                className={`block w-full rounded-md border p-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${current ? "border-primary/50 bg-primary/5" : "border-transparent text-muted-foreground"}`}
              >
                <span className="mb-1 block text-xs">
                  {position} · {current ? "現在地" : "通過"}
                </span>
                <PathTerms knowledge={sentences.get(sentenceId)} />
                <span
                  className={`block break-words text-sm leading-relaxed ${current ? "" : "line-clamp-2"}`}
                >
                  {sentences.get(sentenceId)?.sentence ?? "単文詳細を開く"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {expanded && run.readIds.length > 3 && (
        <Button
          className="mt-2"
          size="sm"
          variant="ghost"
          onClick={() => setExpanded(false)}
        >
          進路を折りたたむ
        </Button>
      )}
    </section>
  );
}
