import { BellRing, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import { useNotifications } from "./NotificationProvider";

export function PushPermissionPrompt() {
  const { pushState, enablePush } = useNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [enabling, setEnabling] = useState(false);

  if (pushState !== "available" || dismissed) return null;

  async function enable() {
    setEnabling(true);
    try {
      if (await enablePush()) {
        toast.success("この端末でプッシュ通知を有効にしました");
      }
    } catch (error) {
      console.error("Failed to enable Web Push", error);
      toast.error("プッシュ通知を設定できませんでした");
    } finally {
      setEnabling(false);
    }
  }

  return (
    <aside className="fixed inset-x-3 bottom-20 z-50 rounded-lg border bg-background p-3 shadow-xl md:hidden">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">準備完了をこの端末に通知</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            許可ボタンを押すと、端末の通知確認が開きます。
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            disabled={enabling}
            onClick={() => void enable()}
          >
            {enabling ? "確認中…" : "通知を許可"}
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-2 size-8"
          aria-label="通知案内を閉じる"
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </Button>
      </div>
    </aside>
  );
}
