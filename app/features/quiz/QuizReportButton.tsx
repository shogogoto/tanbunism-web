import { Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Label } from "~/shared/components/ui/label";
import { Textarea } from "~/shared/components/ui/textarea";
import { type QuizReportReason, reportQuizIssue } from "./api";

export default function QuizReportButton({
  quizId,
  compactMobile = false,
}: { quizId: string; compactMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<QuizReportReason>("undefined");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    setSubmitting(true);
    setError(undefined);
    try {
      await reportQuizIssue(quizId, reason, detail.trim());
      setOpen(false);
      toast.success("クイズの不備を報告しました");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "報告できませんでした。",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="不備を報告"
          title="不備を報告"
          className={
            compactMobile
              ? "min-h-11 min-w-11 px-2 text-muted-foreground sm:min-h-0 sm:min-w-0 sm:px-3"
              : "text-muted-foreground"
          }
        >
          <Flag className="size-4" />
          <span className={compactMobile ? "hidden sm:inline" : undefined}>
            不備を報告
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>クイズの不備を報告</DialogTitle>
          <DialogDescription>
            作成者のクイズ管理に表示します。同じクイズへの再報告は更新されます。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`quiz-report-reason-${quizId}`}>不備の種類</Label>
            <select
              id={`quiz-report-reason-${quizId}`}
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as QuizReportReason)
              }
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="undefined">undefinedなど未定義の内容</option>
              <option value="incorrect">問題・正解・選択肢がおかしい</option>
              <option value="other">その他</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`quiz-report-detail-${quizId}`}>詳細（任意）</Label>
            <Textarea
              id={`quiz-report-detail-${quizId}`}
              value={detail}
              maxLength={500}
              onChange={(event) => setDetail(event.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? "送信中…" : "報告する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
