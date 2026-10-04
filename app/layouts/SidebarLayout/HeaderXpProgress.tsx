import { Link } from "react-router";
import type { UserRead } from "~/shared/generated/fastAPI.schemas";
import { useGetLearningProgressUserUserIdLearningProgressGet } from "~/shared/generated/gamification/gamification";

export default function HeaderXpProgress({ user }: { user: UserRead }) {
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

  const percentage =
    data.xp_for_next_level > 0
      ? Math.min(100, (data.current_level_xp / data.xp_for_next_level) * 100)
      : 100;
  const profilePath = `/user/${user.username || user.uid}`;

  return (
    <Link
      to={profilePath}
      className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`レベル${data.level}、累計${data.total_xp} XP、次のレベルまで${data.xp_to_next_level} XP`}
      title={`Lv.${data.level} · ${data.total_xp} XP`}
    >
      <span className="font-semibold text-foreground">Lv.{data.level}</span>
      <span
        className="h-1.5 w-10 overflow-hidden rounded-full bg-muted sm:w-16"
        aria-hidden="true"
      >
        <span
          className="block h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </span>
      <span>{data.total_xp} XP</span>
    </Link>
  );
}
