import { Link } from "react-router";
import ReviewXpProgress from "~/features/gamification/ReviewXpProgress";
import type { UserRead } from "~/shared/generated/fastAPI.schemas";
import { useGetLearningProgressUserUserIdLearningProgressGet } from "~/shared/generated/gamification/gamification";
import { cn } from "~/shared/lib/utils";

type Props = {
  user: UserRead;
  className?: string;
  progressClassName?: string;
};

export default function HeaderXpProgress({
  user,
  className,
  progressClassName,
}: Props) {
  const progress = useGetLearningProgressUserUserIdLearningProgressGet(
    user.uid,
    {
      fetch: { credentials: "include" },
      swr: {
        dedupingInterval: 30_000,
        keepPreviousData: true,
        revalidateOnFocus: true,
      },
    },
  );
  const data = progress.data?.status === 200 ? progress.data.data : undefined;

  if (!data) return null;

  const todayXp = (data as typeof data & { today_xp?: number }).today_xp;
  const profilePath = `/user/${user.username || user.uid}`;

  return (
    <Link
      to={profilePath}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={`レベル${data.level}、現在${data.current_level_xp} / ${data.xp_for_next_level} XP、累計${data.total_xp} XP${todayXp === undefined ? "" : `、今日 +${todayXp} XP`}`}
      title={`Lv.${data.level} · ${data.current_level_xp} / ${data.xp_for_next_level} XP${todayXp === undefined ? "" : ` · 今日 +${todayXp} XP`}`}
    >
      <span className="font-semibold text-foreground">Lv.{data.level}</span>
      <ReviewXpProgress
        currentXp={data.current_level_xp}
        requiredXp={data.xp_for_next_level}
        todayXp={todayXp}
        label="レベル進捗"
        className={cn("h-1.5 w-10 sm:w-16", progressClassName)}
      />
      <span>
        {data.current_level_xp} / {data.xp_for_next_level} XP
      </span>
    </Link>
  );
}
