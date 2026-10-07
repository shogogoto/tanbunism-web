import { Award, type LucideIcon, Network } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/shared/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/shared/components/ui/tooltip";

export function KnowledgeScore({ score }: { score: number }) {
  return (
    <KnowledgeMetric
      label="スコア"
      value={String(score)}
      Icon={Award}
      color="text-blue-700 dark:text-blue-300"
      description="関係数の合計。前提・結論・参照・被参照・詳細・抽象・具体のつながりを数えます。検索では設定した重みを反映します。"
    />
  );
}

export function KnowledgePageRank({ value }: { value?: number | null }) {
  return (
    <KnowledgeMetric
      label="PageRank"
      value={value == null ? "—" : value.toFixed(2)}
      Icon={Network}
      color="text-purple-700 dark:text-purple-300"
      accessibleValue={value == null ? "未計算・要再計算" : undefined}
      description="参照・推論のつながりから求めた重要度。重要な単文から参照されたり、推論の前提になったりするほど高くなります。リソース内の平均は1です。"
      note={
        value == null
          ? "未計算、またはリソース更新後のため再計算が必要です。"
          : undefined
      }
    />
  );
}

function KnowledgeMetric({
  label,
  value,
  accessibleValue,
  Icon,
  color,
  description,
  note,
}: {
  label: string;
  value: string;
  accessibleValue?: string;
  Icon: LucideIcon;
  color: string;
  description: string;
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const content = (
    <>
      <p className={`font-semibold ${color}`}>{label}</p>
      <p>{description}</p>
      {note && <p className="text-muted-foreground">{note}</p>}
    </>
  );
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setHover(false);
      }}
    >
      <Tooltip
        open={hover && !open}
        onOpenChange={setHover}
        disableHoverableContent
      >
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${label}: ${accessibleValue ?? value}`}
              className={`inline-flex min-h-7 shrink-0 items-center gap-1 rounded-sm px-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${color}`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="font-mono tabular-nums">{value}</span>
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[min(20rem,calc(100vw-2rem))] space-y-1 bg-popover text-popover-foreground border p-3 text-sm"
          sideOffset={6}
        >
          {content}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        className="max-w-[calc(100vw-2rem)] space-y-1 p-3 text-sm"
        aria-label={`${label}の説明`}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
