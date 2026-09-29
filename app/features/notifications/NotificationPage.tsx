import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import { cn } from "~/shared/lib/utils";
import { useNotifications } from "./NotificationProvider";

export default function NotificationPage() {
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
    <div className="mx-auto w-full max-w-3xl p-2 sm:p-3">
      <div className="flex min-h-10 items-center justify-between gap-2 border-x border-t px-2 py-1.5">
        <PushControl
          state={pushState}
          onEnable={() => void changePush(true)}
          onDisable={() => void changePush(false)}
        />
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 text-xs"
            onClick={() => void markAllRead()}
          >
            すべて既読
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="border p-4 text-center text-sm text-muted-foreground">
          通知はありません
        </p>
      ) : (
        <div className="divide-y border" aria-label="通知一覧">
          {notifications.map((notification) => {
            const content = (
              <div
                key={`${notification.uid}-content`}
                className="flex items-start gap-2 p-2"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    notification.read_at ? "bg-transparent" : "bg-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <time className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDate(notification.created)}
                    </time>
                  </div>
                  {notification.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {notification.description}
                    </p>
                  )}
                </div>
              </div>
            );
            const className = cn(
              "block w-full text-left",
              !notification.read_at && "bg-accent/40",
              notification.href && "transition-colors hover:bg-accent",
            );
            return notification.href ? (
              <Link
                key={notification.uid}
                to={notification.href}
                className={className}
                onClick={() => void markRead(notification.uid)}
              >
                {content}
              </Link>
            ) : (
              <button
                key={notification.uid}
                type="button"
                className={className}
                onClick={() => void markRead(notification.uid)}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
    return <p className="text-xs text-muted-foreground">通知設定を確認中…</p>;
  }
  if (state === "available") {
    return (
      <Button type="button" variant="outline" size="sm" onClick={onEnable}>
        プッシュ通知を有効にする
      </Button>
    );
  }
  if (state === "subscribed") {
    return (
      <div className="flex items-center gap-2 text-xs">
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
      <p className="text-xs text-muted-foreground">
        ブラウザ設定で通知が拒否されています
      </p>
    );
  }
  if (state === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        このブラウザでは利用できません。iPhoneではホーム画面へ追加してください
      </p>
    );
  }
  return (
    <p className="text-xs text-muted-foreground">
      プッシュ通知は現在利用できません
    </p>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
