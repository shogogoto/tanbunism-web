import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import {
  type AdminUserItem,
  type UserTransferPreview,
  previewUserTransfer,
  transferUserData,
} from "./api";

const countLabels: Record<string, string> = {
  Resource: "読書メモ",
  Folder: "フォルダ",
  Quiz: "作成クイズ",
  Answer: "回答履歴",
  TanbunExposure: "見たよ",
  ResourceXpEvent: "XP記録",
  StudyPlan: "学習計画",
  ReviewSettings: "復習設定",
  QuizReport: "クイズ報告",
  Notification: "通知",
  DailyRecommendation: "推薦セット",
  ReviewDaySettings: "日別設定",
  Archievement: "集計履歴",
  PageRankJob: "PageRank履歴",
};

export default function UserDataTransfer({
  source,
  users,
  onClose,
  onTransferred,
}: {
  source: AdminUserItem;
  users: AdminUserItem[];
  onClose: () => void;
  onTransferred: () => Promise<void>;
}) {
  const [targetId, setTargetId] = useState("");
  const [preview, setPreview] = useState<UserTransferPreview>();
  const [sourceConfirmation, setSourceConfirmation] = useState("");
  const [targetConfirmation, setTargetConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function inspect() {
    setBusy(true);
    setPreview(undefined);
    setError(undefined);
    try {
      setPreview(await previewUserTransfer(source.uid, targetId));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "移行内容を取得できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }
  async function execute() {
    if (!preview) return;
    setBusy(true);
    setError(undefined);
    try {
      await transferUserData(source.uid, {
        target_id: preview.target_id,
        source_confirmation: sourceConfirmation,
        target_confirmation: targetConfirmation,
        preview_token: preview.preview_token,
      });
      toast.success("データを移行しました。元のUserは残っています");
      onClose();
      await onTransferred().catch(() =>
        toast.error(
          "移行は完了しましたが、一覧の更新に失敗しました。再読み込みしてください",
        ),
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "移行できませんでした");
      setPreview(undefined);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ユーザーデータの移行</DialogTitle>
          <DialogDescription>
            元Userを残して、空のアカウントへデータを移動します（コピーではありません）。
            ログイン情報・プロフィール・権限・Push登録は変更しません。
            DBのバックアップを取得し、両アカウントのimport・クイズ作成・復習を止めてから実行してください。
          </DialogDescription>
        </DialogHeader>
        <p className="break-all text-sm">移行元: {source.email}</p>
        <div className="space-y-2">
          <Label htmlFor="transfer-target">移行先ユーザー</Label>
          <select
            id="transfer-target"
            value={targetId}
            disabled={busy}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            onChange={(event) => {
              setTargetId(event.target.value);
              setPreview(undefined);
              setSourceConfirmation("");
              setTargetConfirmation("");
              setError(undefined);
            }}
          >
            <option value="">選択してください</option>
            {users
              .filter((user) => user.uid !== source.uid)
              .map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.email}
                </option>
              ))}
          </select>
        </div>
        <Button
          variant="outline"
          disabled={!targetId || busy}
          onClick={() => void inspect()}
        >
          {busy ? "処理中…" : "移行内容を確認"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {preview && (
          <div className="space-y-3">
            <p className="break-all text-sm">移行先: {preview.target_email}</p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(preview.counts).map(([label, count]) => (
                <div key={label} className="flex justify-between gap-2">
                  <dt>{countLabels[label] ?? label}</dt>
                  <dd>{count}件</dd>
                </div>
              ))}
            </dl>
            {preview.blockers.map((reason) => (
              <p key={reason} role="alert" className="text-sm text-destructive">
                {reason}
              </p>
            ))}
            <Label htmlFor="transfer-source-confirm">
              確認用の移行元メールアドレス
            </Label>
            <Input
              id="transfer-source-confirm"
              value={sourceConfirmation}
              disabled={busy}
              autoComplete="off"
              onChange={(event) => setSourceConfirmation(event.target.value)}
            />
            <Label htmlFor="transfer-target-confirm">
              確認用の移行先メールアドレス
            </Label>
            <Input
              id="transfer-target-confirm"
              value={targetConfirmation}
              disabled={busy}
              autoComplete="off"
              onChange={(event) => setTargetConfirmation(event.target.value)}
            />
            <Button
              disabled={
                busy ||
                !!preview.blockers.length ||
                !Object.values(preview.counts).some(Boolean) ||
                sourceConfirmation !== preview.source_email ||
                targetConfirmation !== preview.target_email
              }
              onClick={() => void execute()}
            >
              データを移行する
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
