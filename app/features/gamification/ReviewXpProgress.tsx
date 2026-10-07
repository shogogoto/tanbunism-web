import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "~/shared/lib/utils";

export default function ReviewXpProgress({
  currentXp,
  requiredXp,
  todayXp,
  className,
  label = "XP進捗",
}: {
  currentXp: number;
  requiredXp: number;
  todayXp?: number;
  className?: string;
  label?: string;
}) {
  const maximum = Math.max(1, requiredXp);
  const current = Math.min(maximum, Math.max(0, currentXp));
  // 今日Lvが上がった場合、現在のLvへ持ち越したXPだけを色付けする。
  const today = Math.min(current, Math.max(0, todayXp ?? 0));
  const previous = current - today;
  const description = `${currentXp} / ${requiredXp} XP${todayXp === undefined ? "" : ` · 今日 +${todayXp} XP`}`;
  return (
    <ProgressPrimitive.Root
      value={(current / maximum) * 100}
      aria-label={label}
      aria-valuetext={description}
      title={description}
      className={cn(
        "relative flex h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <span
        data-xp-segment="previous"
        aria-hidden="true"
        className="h-full shrink-0 bg-primary transition-[width]"
        style={{ width: `${(previous / maximum) * 100}%` }}
      />
      <span
        data-xp-segment="today"
        aria-hidden="true"
        className="h-full shrink-0 bg-emerald-500 transition-[width] dark:bg-emerald-400"
        style={{ width: `${(today / maximum) * 100}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
