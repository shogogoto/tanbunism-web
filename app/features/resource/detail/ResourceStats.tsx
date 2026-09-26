import { GitFork, List, ListChecks, TextInitial } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/shared/components/ui/button";
import type { ResourceStats as ResourceStatsType } from "~/shared/generated/fastAPI.schemas";

type Props = {
  resourceId: string;
  stats: ResourceStatsType;
};

export default function ResourceStats({ resourceId, stats }: Props) {
  return (
    <div className="not-prose mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card/40 px-3 py-2">
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground"
        aria-label="Resourceの統計"
      >
        <Stat Icon={List} label="単文" value={stats.n_sentence} />
        <Stat Icon={TextInitial} label="用語" value={stats.n_term} />
        <Stat Icon={GitFork} label="関係" value={stats.n_edge} />
      </div>
      <Button asChild variant="outline" size="sm">
        <Link
          to={`/quiz/list?resource=${resourceId}`}
          className="!text-foreground !no-underline"
        >
          <ListChecks className="size-4" />
          クイズ一覧
        </Link>
      </Button>
    </div>
  );
}

function Stat({
  Icon,
  label,
  value,
}: {
  Icon: typeof List;
  label: string;
  value: number;
}) {
  return (
    <span className="flex items-center gap-1" title={`${label}数`}>
      <Icon className="size-4" aria-hidden="true" />
      <span className="font-mono tabular-nums text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  );
}
