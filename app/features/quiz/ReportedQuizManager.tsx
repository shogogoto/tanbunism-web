import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/shared/components/ui/alert-dialog";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import ReportedQuizDetailDialog from "./ReportedQuizDetailDialog";
import {
  type QuizReport,
  deleteQuizzes,
  dismissReportedQuiz,
  listCreatedQuizReports,
} from "./api";

const reasonLabels: Record<QuizReport["reason"], string> = {
  undefined: "未定義",
  incorrect: "内容が不正確",
  other: "その他",
};

export default function ReportedQuizManager() {
  const [items, setItems] = useState<QuizReport[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    listCreatedQuizReports()
      .then(setItems)
      .catch((caught) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "不備報告を取得できませんでした。",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function removeSelected() {
    try {
      await deleteQuizzes([...selected]);
      setItems((current) =>
        current.filter((item) => !selected.has(item.quiz_id)),
      );
      toast.success(`${selected.size}件の報告対象クイズを削除しました`);
      setSelected(new Set());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "削除できませんでした。",
      );
    }
  }

  async function dismiss(item: QuizReport) {
    try {
      await dismissReportedQuiz(item.quiz_id);
      setItems((current) =>
        current.filter((candidate) => candidate.quiz_id !== item.quiz_id),
      );
      setSelected((current) => {
        const next = new Set(current);
        next.delete(item.quiz_id);
        return next;
      });
      toast.success("クイズを変更せず、不備報告を対応済みにしました");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "不備報告を対応済みにできませんでした。",
      );
    }
  }

  if (loading || (items.length === 0 && !error)) return null;
  if (error && items.length === 0) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <section className="space-y-3 border border-destructive/40 bg-destructive/5 p-3">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">不備が報告されたクイズ</h2>
        <Badge variant="destructive">{items.length}</Badge>
        {selected.size > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="ml-auto"
              >
                クイズを{selected.size}件削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  選択した{selected.size}件のクイズを削除しますか？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  クイズ本体と、その回答履歴・不備報告を削除します。元のResourceやTanbunは削除されません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => void removeSelected()}>
                  クイズを削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={items.every((item) => selected.has(item.quiz_id))}
          onChange={(event) =>
            setSelected(
              event.target.checked
                ? new Set(items.map((item) => item.quiz_id))
                : new Set(),
            )
          }
        />
        すべて選択
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="divide-y">
        {items.map((item) => (
          <div
            key={item.quiz_id}
            className="flex items-start gap-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              className="mt-1"
              aria-label={`クイズを選択: ${item.quiz?.statement ?? item.quiz_id}`}
              checked={selected.has(item.quiz_id)}
              onChange={(event) =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(item.quiz_id);
                  else next.delete(item.quiz_id);
                  return next;
                })
              }
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{reasonLabels[item.reason]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {item.report_count}件 · {item.quiz_id}
                </span>
              </span>
              {item.detail && <span className="mt-1 block">{item.detail}</span>}
              {item.resource_id && (
                <Link
                  to={`/resource/${item.resource_id}`}
                  className="mt-1 block truncate text-xs text-muted-foreground underline"
                >
                  {item.resource_name ?? item.resource_id}
                </Link>
              )}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {item.quiz ? (
                <ReportedQuizDetailDialog report={item} quiz={item.quiz} />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  title="backendの更新後に確認できます"
                >
                  詳細
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    問題なし
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      このクイズを問題なしとして閉じますか？
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      クイズは変更・削除せず、不備報告だけを対応済みにして一覧から除外します。再び報告された場合は要対応へ戻ります。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void dismiss(item)}>
                      対応済みにする
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
