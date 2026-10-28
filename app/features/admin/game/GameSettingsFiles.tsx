import { useRef, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import {
  type GameSettingsPreview,
  downloadGameSettings,
  exportGameSettings,
  previewGameSettings,
  readGameSettingsFile,
  saveGameSettings,
} from "./gameSettingsFiles";

const names: Record<string, string> = {
  skills: "スキル",
  skill_templates: "効果テンプレート",
  variant_sets: "効果の変型セット",
  trigger_variant_sets: "ガンビットの変型セット",
  items: "アイテム",
  enemies: "敵",
  triggers: "ガンビット",
  specialty_skills: "専門分野",
  player_skills: "習得スキル",
  shop: "ショップ",
  elements: "属性",
};
function sectionName(section: string) {
  const [group, field] = section.split(".");
  return group === "catalog"
    ? (names[field] ?? field)
    : `${group === "balance" ? "ゲームバランス" : "回答時間"}：${field}`;
}
export default function GameSettingsFiles({
  onApplied,
}: { onApplied: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [preview, setPreview] = useState<GameSettingsPreview>();
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="ゲーム設定JSON" className="border-b px-4 py-3">
      <div className="mx-auto flex max-w-fit flex-wrap items-center gap-2">
        <span className="text-sm font-medium">ゲーム設定JSON</span>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          aria-label="ゲーム設定JSONファイル"
          className="sr-only"
          tabIndex={-1}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file)
              void run(async () => {
                const next = await previewGameSettings(
                  await readGameSettingsFile(file),
                );
                setPreview(next);
              });
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          JSONを取り込む
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(async () =>
              downloadGameSettings(await exportGameSettings()),
            )
          }
        >
          JSONを書き出す
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        保存済みのゲーム設定全体が対象です。未保存の編集内容やプレイヤーの進行・所持品は含みません。
      </p>
      {error && !preview && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {message && (
        <output className="mt-2 block text-center text-sm">{message}</output>
      )}
      <Dialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPreview(undefined);
            setError(undefined);
          }
        }}
      >
        <DialogContent
          className="max-h-[85dvh] overflow-y-auto sm:max-w-4xl"
          data-dashboard-swipe-ignore
        >
          <DialogHeader>
            <DialogTitle>ゲーム設定の取り込み確認</DialogTitle>
            <DialogDescription>
              同じIDの定義を更新し、ファイルにない定義は残します。反映すると各タブの未保存の編集内容は破棄されます。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!preview?.changes.length && <p>変更はありません。</p>}
          {preview?.changes.map((change) => (
            <details
              key={change.section}
              className="min-w-0 rounded border p-3"
            >
              <summary className="cursor-pointer text-sm font-medium">
                {sectionName(change.section)}
              </summary>
              <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-2">
                {[
                  ["変更前", change.before],
                  ["変更後", change.after],
                ].map(([label, value]) => (
                  <div key={String(label)} className="min-w-0">
                    <p className="mb-1 text-xs text-muted-foreground">
                      {String(label)}
                    </p>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
          ))}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setPreview(undefined)}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              disabled={busy || !preview?.changes.length}
              onClick={() => {
                if (preview)
                  void run(async () => {
                    downloadGameSettings(preview.backup, true);
                    await saveGameSettings(preview);
                    setPreview(undefined);
                    setMessage(
                      "ゲーム設定を反映しました。変更前の設定はバックアップに書き出しました。",
                    );
                    onApplied();
                  });
              }}
            >
              バックアップして反映
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
