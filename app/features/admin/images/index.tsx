import { useState } from "react";
import { toast } from "sonner";
import { imageRequest } from "~/features/user/ImageUploader/api";
import { Button } from "~/shared/components/ui/button";

type Inventory = {
  resources: {
    public_id: string;
    bytes: number;
    created_at: string;
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
  async function cleanup() {
    if (
      !window.confirm(
        `選択した未参照のアバター画像${selected.length}件を削除予約しますか？`,
      )
    )
      return;
    setBusy(true);
    try {
      const result = await imageRequest<{ scheduled: string[] }>(
        "/admin/images/cleanup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_ids: selected }),
        },
      );
      toast.success(`${result.scheduled.length}件の画像を削除予約しました`);
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
        未参照で72時間以上経過したアバターのみ削除できます。確認した画像を選択してください。
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
          onClick={cleanup}
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">選択</th>
              <th className="p-2 text-left">画像ID</th>
              <th>容量</th>
              <th>状態</th>
            </tr>
          </thead>
          <tbody>
            {inventory?.resources.map((image) => (
              <tr key={image.public_id} className="border-b">
                <td className="p-2 text-center">
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
                </td>
                <td className="p-2 break-all">{image.public_id}</td>
                <td className="p-2 whitespace-nowrap">
                  {Math.ceil(image.bytes / 1024)} KB
                </td>
                <td className="p-2 whitespace-nowrap">
                  {image.referenced
                    ? "参照中"
                    : image.can_delete
                      ? "未参照"
                      : "保護中"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
