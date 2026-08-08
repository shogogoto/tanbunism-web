import { File, Lightbulb, Search, User } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "../lib/utils";

const historyTypes = ["user", "tanbun", "resource", "search"] as const;
type HistoryType = (typeof historyTypes)[number];

type Style = {
  Icon:
    | ComponentType<{ className?: string; size?: string | number }>
    | undefined;
  color: string;
};

const historyTypeStyles: Record<HistoryType, Style> = {
  user: {
    Icon: User,
    color: "text-purple-500",
  },
  tanbun: {
    Icon: Lightbulb,
    color: "text-blue-500",
  },
  resource: {
    Icon: File,
    color: "text-amber-700", // brownに近い色
  },
  search: {
    Icon: Search,
    color: "text-cyan-500",
  },
};

export function getHistoryTypeStyleByInclusion(str: string): Style {
  for (const keyword of historyTypes) {
    if (str.includes(keyword)) {
      return historyTypeStyles[keyword];
    }
  }
  return { Icon: undefined, color: "text-muted-foreground" };
}

export function HistoryItemIcon({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const { Icon, color } = getHistoryTypeStyleByInclusion(url);
  if (!Icon) {
    return null;
  }
  return <Icon className={cn(color, className)} size="1em" />;
}
