import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { imageRequest } from "~/features/user/ImageUploader/api";
import { getTransformedImageUrl } from "~/features/user/libs/image";
import { Button } from "~/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/shared/components/ui/popover";

type Inventory = {
  resources: {
    public_id: string;
    bytes: number;
    url?: string | null;
    referenced: boolean;
    can_delete: boolean;
  }[];
  next_cursor: string | null;
  pending: number;
  retrying: number;
};

function PreviewImage({ url, publicId }: { url: string; publicId: string }) {
  const [source, setSource] = useState(
    getTransformedImageUrl(url, 320, 320, "fit") ?? url,
  );
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="text-xs text-muted-foreground">読み込み失敗</span>
  ) : (
    <img
      src={source}
      alt={publicId}
      loading="lazy"
      className="h-full w-full object-contain"
      onError={() => {
        if (source !== url) setSource(url);
        else setFailed(true);
      }}
    />
  );
}

function ImagePreview({ url, publicId }: { url: string; publicId: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="size-12 rounded bg-muted flex items-center justify-center"
          aria-label={`${publicId}のプレビュー`}
          onMouseEnter={show}
          onMouseLeave={hide}
          onClick={(event) => {
            event.preventDefault();
            show();
          }}
        >
          <PreviewImage url={url} publicId={publicId} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        className="w-[min(320px,85vw)] p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <div className="aspect-square">
          <PreviewImage url={url} publicId={`${publicId}の拡大画像`} />
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-sm underline"
          aria-label={`${publicId}の画像を開く`}
        >
          元画像を開く
        </a>
      </PopoverContent>
    </Popover>
  );
}

export default function ImageManager() {
  const [inventory, setInventory] = useState<Inventory>();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const resources: Inventory["resources"] = [];
      const cursors = new Set<string>();
      let cursor: string | undefined;
      let page: Inventory;
      do {
        page = await imageRequest<Inventory>(
          `/admin/images${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
        );
        resources.push(...page.resources);
        cursor = page.next_cursor ?? undefined;
        if (cursor && cursors.has(cursor))
          throw new Error(
            "画像一覧の取得が完了しませんでした。再試行してください。",
          );
        if (cursor) cursors.add(cursor);
      } while (cursor);
      setInventory({ ...page, resources, next_cursor: null });
      setSelected([]);
    } catch (cause) {
      setInventory(undefined);
      setError(
        cause instanceof Error ? cause.message : "画像を取得できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const deletable =
    inventory?.resources
      .filter((image) => image.can_delete && !image.referenced)
      .map((image) => image.public_id) ?? [];
  async function cleanup(ids = selected) {
    if (!ids.length) return;
    if (
      !window.confirm(
        `未参照のアバター画像${ids.length}件を今すぐ削除しますか？\nアップロード直後の画像も削除されます。この操作は取り消せません。`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = { deleted: [] as string[], skipped: [] as string[] };
      // The API accepts at most 100 IDs and rechecks references before deletion.
      for (let offset = 0; offset < ids.length; offset += 100) {
        const batch = await imageRequest<typeof result>(
          "/admin/images/delete",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              public_ids: ids.slice(offset, offset + 100),
            }),
          },
        );
        result.deleted.push(...batch.deleted);
        result.skipped.push(...batch.skipped);
      }
      if (result.deleted.length)
        toast.success(`${result.deleted.length}件の画像を削除しました`);
      if (result.skipped.length)
        toast.info(
          `${result.skipped.length}件は参照中または対象外のため削除しませんでした`,
        );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "画像の削除に失敗しました。更新して現在の状態を確認してください。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <h2 className="font-semibold">Cloudinary画像</h2>
      <p className="text-sm text-muted-foreground">
        未参照のアバター画像は即時削除できます。プレビューはホバー・クリックで拡大します。使用中の画像は削除できません。
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <Button disabled={busy} onClick={() => load()}>
          {busy ? "処理中…" : "画像を確認・更新"}
        </Button>
        <Button
          disabled={busy || !deletable.length}
          variant="destructive"
          onClick={() => cleanup(deletable)}
        >
          未参照画像{deletable.length}件をすべて削除
        </Button>
        <Button
          disabled={busy || !selected.length}
          variant="destructive"
          onClick={() => cleanup()}
        >
          選択した画像{selected.length}件を削除
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {inventory && (
        <p className="text-sm">
          自動削除待ち {inventory.pending}件 / 再試行中 {inventory.retrying}件
        </p>
      )}
      {inventory?.resources.length === 0 && (
        <p className="text-sm text-muted-foreground">
          アバター画像はありません。
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">選択</th>
              <th className="p-2">画像</th>
              <th className="p-2">画像ID</th>
              <th className="p-2">容量</th>
              <th className="p-2">参照状態</th>
              <th className="p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {inventory?.resources.map((image) => (
              <tr key={image.public_id} className="border-b">
                <td className="p-2">
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
                <td className="p-2">
                  {image.url ? (
                    <ImagePreview
                      key={image.url}
                      url={image.url}
                      publicId={image.public_id}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      プレビューなし
                    </span>
                  )}
                </td>
                <td className="p-2 break-all min-w-48">{image.public_id}</td>
                <td className="p-2 whitespace-nowrap">
                  {Math.ceil(image.bytes / 1024)} KB
                </td>
                <td className="p-2 whitespace-nowrap">
                  <span
                    className={
                      image.referenced ? "text-emerald-500" : "text-amber-500"
                    }
                  >
                    {image.referenced ? "参照中" : "未参照"}
                  </span>
                  {!image.can_delete && (
                    <p className="text-xs text-muted-foreground">
                      {image.referenced
                        ? "使用中のため削除不可"
                        : "アバターフォルダ外"}
                    </p>
                  )}
                </td>
                <td className="p-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy || !image.can_delete}
                    onClick={() => cleanup([image.public_id])}
                    aria-label={`${image.public_id}を削除`}
                  >
                    削除
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
