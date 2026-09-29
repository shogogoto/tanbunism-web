import { Bell } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/shared/components/ui/popover";
import { cn } from "~/shared/lib/utils";
import { useNotifications } from "./NotificationProvider";

export default function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    pushState,
    markRead,
    markAllRead,
    enablePush,
    disablePush,
  } = useNotifications();

  async function changePush(enabled: boolean) {
    try {
      if (enabled) {
        const subscribed = await enablePush();
        if (subscribed) {
          toast.success("この端末でプッシュ通知を有効にしました");
        }
      } else {
        await disablePush();
        toast.success("この端末のプッシュ通知を解除しました");
      }
    } catch (error) {
      console.error("Failed to change Web Push subscription", error);
      toast.error("プッシュ通知を設定できませんでした");
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount > 0 ? `通知（未読${unreadCount}件）` : "通知"}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex min-w-3.5 -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] leading-3.5 text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="text-sm font-semibold">通知</h2>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={markAllRead}
            >
              すべて既読
            </Button>
          )}
        </div>
        <PushControl
          state={pushState}
          onEnable={() => void changePush(true)}
          onDisable={() => void changePush(false)}
        />
        {notifications.length === 0 ? (
          <p className="p-5 text-center text-sm text-muted-foreground">
            通知はありません
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => {
              const content = (
                <div
                  key={`${notification.uid}-content`}
                  className="flex items-start gap-2"
                >
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      notification.read_at ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {notification.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {notification.description}
                      </p>
                    )}
                    <time className="mt-1 block text-[11px] text-muted-foreground">
                      {formatDate(notification.created)}
                    </time>
                  </div>
                </div>
              );
              const className = cn(
                "block border-b px-3 py-3 text-left last:border-b-0",
                !notification.read_at && "bg-accent/40",
                notification.href && "transition-colors hover:bg-accent",
              );
              return notification.href ? (
                <Link
                  key={notification.uid}
                  to={notification.href ?? "/"}
                  className={className}
                  onClick={() => void markRead(notification.uid)}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={notification.uid}
                  type="button"
                  className={`${className} w-full`}
                  onClick={() => void markRead(notification.uid)}
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function PushControl({
  state,
  onEnable,
  onDisable,
}: {
  state: ReturnType<typeof useNotifications>["pushState"];
  onEnable: () => void;
  onDisable: () => void;
}) {
  if (state === "checking") {
    return (
      <p className="border-b px-3 py-2 text-xs text-muted-foreground">
        プッシュ通知を確認中…
      </p>
    );
  }
  if (state === "available") {
    return (
      <div className="border-b p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onEnable}
        >
          この端末でプッシュ通知を有効にする
        </Button>
      </div>
    );
  }
  if (state === "subscribed") {
    return (
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs">
        <span className="text-muted-foreground">プッシュ通知は有効です</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onDisable}
        >
          解除
        </Button>
      </div>
    );
  }
  if (state === "denied") {
    return (
      <p className="border-b px-3 py-2 text-xs text-muted-foreground">
        ブラウザ設定で通知が拒否されています
      </p>
    );
  }
  if (state === "unsupported") {
    return (
      <p className="border-b px-3 py-2 text-xs text-muted-foreground">
        このブラウザではプッシュ通知を利用できません。iPhoneではホーム画面へ追加して開いてください
      </p>
    );
  }
  return null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
