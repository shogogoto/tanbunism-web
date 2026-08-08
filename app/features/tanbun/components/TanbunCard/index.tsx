import {
  Award,
  BookText,
  Calendar,
  ChevronsDown,
  ChevronsUp,
  GitFork,
  GitPullRequest,
  MapPin,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { HashLink } from "~/shared/components/HashLink";
import StatViewItem from "~/shared/components/stats/StatViewItem";
import { Badge } from "~/shared/components/ui/badge";
import { Card, CardContent, CardFooter } from "~/shared/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/shared/components/ui/collapsible";
import { TooltipProvider } from "~/shared/components/ui/tooltip";
import type {
  Additional,
  MResource,
  Tanbun,
  TanbunStats,
} from "~/shared/generated/fastAPI.schemas";
import { cn } from "~/shared/lib/utils";
import { useDetailContext } from "../../detail/DetailContext";
import { Highlight } from "../Highlight";

type Props = {
  k: Tanbun;
  index?: number;
  query?: string;
  className?: string;
  borderColor?: string;
};

export default function TanbunCard({
  k,
  index,
  query,
  className,
  borderColor,
}: Props) {
  const [searchParams, _] = useSearchParams();
  const detailContext = useDetailContext();
  const score = k.stats?.score || 0;

  const card = (
    <Card
      key={k.uid}
      className={cn("w-full max-w-3xl border-l-2", borderColor, className)}
    >
      <TanbunCardContent k={k} query={query} />
      <TanbunCardFooter k={k} index={index} />
    </Card>
  );

  if (score === 0) {
    return card;
  }
  return (
    <Link
      to={`/tanbun/${k.uid}?${searchParams.toString()}`}
      draggable={false} // テキストをコピペできるため
      {...(detailContext && {
        state: { tanbun: k, ...detailContext },
      })}
    >
      {card}
    </Link>
  );
}

type KProps = {
  k: Tanbun;
  className?: string;
  resource?: MResource;
  query?: string;
};

export function TanbunCardContent({ k, className, resource, query }: KProps) {
  return (
    <CardContent>
      <div className="flex flex-wrap items-start gap-2">
        {k.term?.names?.map((name) => (
          <span
            key={name}
            className={cn(
              "rounded-full font-bold text-green-800  dark:text-green-500",
              className,
            )}
          >
            <Highlight text={name} query={query ?? ""} />
          </span>
        ))}
      </div>
      {k.sentence !== "<<<not defined>>>" && (
        <span className="break-all">
          <Highlight text={k.sentence} query={query ?? ""} />
        </span>
      )}
      <div className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
        {resource && (
          <HashLink
            to={`/resource/${resource.uid}#${k.uid}`}
            className="hover:underline"
          >
            {resource.name}
            {/* <span>{resource?.authors}</span> */}
            {/* <span>{resource?.published}</span> */}
          </HashLink>
        )}
        <AdditionalItem additional={k.additional ?? undefined} />
      </div>
    </CardContent>
  );
}

export function TanbunCardFooter({ k, index }: KProps & { index?: number }) {
  return (
    <CardFooter className="flex justify-between">
      <TooltipProvider>
        <StatViews stats={k.stats} />
      </TooltipProvider>
      {index !== undefined && <Badge>#{index}</Badge>}
    </CardFooter>
  );
}

export function createStatView(stats: TanbunStats | undefined) {
  const f = (stat: { Icon: LucideIcon; label: string; value?: number }) =>
    stat.value != null && (
      <StatViewItem
        key={stat.label}
        Icon={stat.Icon}
        label={stat.label}
        value={stat.value}
      />
    );

  const items = {
    s: { Icon: Award, label: "スコア", value: stats?.score || 0 },
    d: { Icon: BookText, label: "詳細数", value: stats?.n_detail },
    pre: { Icon: ChevronsUp, label: "前提数", value: stats?.n_premise },
    con: { Icon: ChevronsDown, label: "結論数", value: stats?.n_conclusion },
    refer: { Icon: GitFork, label: "参照数", value: stats?.n_refer },
    refd: { Icon: GitPullRequest, label: "被参照数", value: stats?.n_referred },
  };

  return {
    score: f(items.s),
    detail: f(items.d),
    premise: f(items.pre),
    conclusion: f(items.con),
    refer: f(items.refer),
    referred: f(items.refd),
  };
}

function StatViews({
  stats,
  collapsible,
}: { stats: TanbunStats | undefined; collapsible?: boolean }) {
  const st = createStatView(stats);
  const items_c = [st.detail, st.premise, st.conclusion, st.refer, st.referred];

  const className = "flex flex-wrap items-center gap-x-2";
  if (collapsible)
    return (
      <Collapsible>
        <div className={className}>
          <CollapsibleTrigger>{st.score}</CollapsibleTrigger>
          <CollapsibleContent className={className}>
            {items_c}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );

  return (
    <div className={className}>
      {st.score}
      {items_c}
    </div>
  );
}

export function AdditionalItem({
  additional,
}: { additional: Additional | undefined }) {
  if (!additional) {
    return null;
  }
  return (
    <>
      {additional.when && (
        <span className="flex items-center">
          <Calendar className="size-4" />
          {additional.when}
        </span>
      )}
      {additional.where && (
        <span className="flex items-center">
          <MapPin className="size-4" />
          {additional.where}
        </span>
      )}
      {additional.by && (
        <span className="flex items-center">
          <User className="size-4" />
          {additional.by}
        </span>
      )}
    </>
  );
}
