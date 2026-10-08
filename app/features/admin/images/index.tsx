import { useState } from "react";
import { toast } from "sonner";
import { imageRequest } from "~/features/user/ImageUploader/api";
import { getTransformedImageUrl } from "~/features/user/libs/image";
import { Button } from "~/shared/components/ui/button";

type Inventory = {
  resources: {
    public_id: string;
    bytes: number;
    created_at: string;
    url?: string | null;
    referenced: boolean;
    can_delete: boolean;
  }[];
  next_cursor: string | null;
  pending: number;
  retrying: number;
};

export default function ImageManager() {
  const [inventory, setInventory] = useState<Inventory>();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load(cursor?: string) {
    setBusy(true);
    setError("");
    try {
      const data = await imageRequest<Inventory>(
        `/admin/images${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      setInventory(data);
      setSelected([]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "画像を取得できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }
  async function cleanup(ids = selected) {
    if (
      !window.confirm(
        `未参照のアバター画像${ids.length}件を削除予約しますか？\n約1時間後に再確認して削除します。この操作は取り消せません。`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await imageRequest<{ scheduled: string[] }>(
        "/admin/images/cleanup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_ids: ids }),
        },
      );
      if (result.scheduled.length) {
        toast.success(`${result.scheduled.length}件の画像を削除予約しました`);
      } else {
        toast.info(
          "削除対象はありません。参照状態などが変わった可能性があります。",
        );
      }
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "画像の削除予約に失敗しました。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4 p-4 sm:p-6">
      <h2 className="font-semibold">Cloudinary画像</h2>
      <p className="text-sm text-muted-foreground">
        アバター画像を表示します。未参照で72時間以上経過した画像のみ削除予約できます。予約後、約1時間後に参照状態を再確認して削除します。
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <Button disabled={busy} onClick={() => load()}>
          {busy ? "処理中…" : "画像を確認・更新"}
        </Button>
        {inventory?.next_cursor && (
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => load(inventory.next_cursor ?? undefined)}
          >
            次の100件
          </Button>
        )}
        <Button
          disabled={busy || !selected.length}
          variant="destructive"
          onClick={() => cleanup()}
        >
          選択した画像{selected.length}件を削除予約
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {inventory && (
        <p className="text-sm">
          削除待ち {inventory.pending}件 / 再試行中 {inventory.retrying}件
        </p>
      )}
      {inventory?.resources.length === 0 && (
        <p className="text-sm text-muted-foreground">
          アバター画像はありません。
        </p>
      )}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {inventory?.resources.map((image) => (
          <article
            key={image.public_id}
            className="min-w-0 overflow-hidden rounded-lg border bg-card"
          >
            <div className="aspect-square bg-muted flex items-center justify-center">
              {image.url ? (
                <a
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="h-full w-full"
                  aria-label={`${image.public_id}の画像を開く`}
                >
                  <img
                    src={getTransformedImageUrl(image.url, 320, 320, "fit")}
                    alt={image.public_id}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">
                  プレビューなし
                </span>
              )}
            </div>
            <div className="space-y-3 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    image.referenced ? "text-emerald-500" : "text-amber-500"
                  }
                >
                  {image.referenced ? "参照中" : "未参照（参照なし）"}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {Math.ceil(image.bytes / 1024)} KB
                </span>
              </div>
              <p className="break-all text-xs text-muted-foreground">
                {image.public_id}
              </p>
              {!image.can_delete && (
                <p className="text-xs text-muted-foreground">
                  {image.referenced
                    ? "使用中のため削除できません"
                    : "保護中：72時間以内、または管理対象外の画像"}
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={image.public_id}
                    disabled={!image.can_delete || busy}
                    checked={selected.includes(image.public_id)}
                    onChange={(event) =>
                      setSelected((items) =>
                        event.target.checked
                          ? [...items, image.public_id]
                          : items.filter((id) => id !== image.public_id),
                      )
                    }
                  />
                  選択
                </label>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy || !image.can_delete}
                  onClick={() => cleanup([image.public_id])}
                  aria-label={`${image.public_id}を削除予約`}
                >
                  削除予約
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
