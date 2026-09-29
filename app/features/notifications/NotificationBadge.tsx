import { useNotifications } from "./NotificationProvider";

export function NotificationBadge({ compact = false }: { compact?: boolean }) {
  const { unreadCount } = useNotifications();
  if (unreadCount === 0) return null;

  return (
    <span
      className={
        compact
          ? "absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[9px] leading-4 text-destructive-foreground"
          : "ml-auto min-w-5 rounded-full bg-destructive px-1.5 text-center text-[10px] leading-5 text-destructive-foreground"
      }
      aria-label={`未読${unreadCount}件`}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
