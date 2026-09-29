import { RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import { Button } from "~/shared/components/ui/button";
import { Checkbox } from "~/shared/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/shared/components/ui/table";
import {
  type AdminBrokenQuiz,
  deleteAdminBrokenQuizzes,
  listAdminBrokenQuizzes,
} from "./api";

const labels: Record<AdminBrokenQuiz["quiz_type"], string> = {
  term2sent: "用語→単文",
  sent2term: "単文→用語",
  rel2pair: "関係→ペア",
  pair2rel: "ペア→関係",
};

export default function BrokenQuizManager() {
  const [items, setItems] = useState<AdminBrokenQuiz[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const loaded = await listAdminBrokenQuizzes();
      setItems(loaded);
      setSelected(
        (current) =>
          new Set(
            [...current].filter((id) =>
              loaded.some((item) => item.quiz_id === id),
            ),
          ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "参照切れクイズを取得できませんでした。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  async function remove() {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const result = await deleteAdminBrokenQuizzes([...selected]);
      toast.success(
        `${result.deleted_count}件のQuizと${result.deleted_answer_count}件の回答を削除しました`,
      );
      setSelected(new Set());
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "クイズを削除できませんでした。",
      );
    } finally {
      setDeleting(false);
    }
  }

  const allSelected = items.length > 0 && selected.size === items.length;
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">参照切れQuiz</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          退役したTanbunを参照するQuizです。RELの意味を推測して修復せず、確認後にQuizと回答履歴をまとめて削除します。
        </p>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading ? "検出中…" : `${items.length}件を検出`}{" "}
          {selected.size > 0 && `・${selected.size}件を選択`}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading || deleting}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            再検出
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={selected.size === 0 || deleting}
              >
                <Trash2 />
                選択を削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {selected.size}件のQuizを削除しますか？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Quiz本体だけでなく、紐づく回答履歴も削除されます。この操作は元に戻せません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => void remove()}>
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {!loading && items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm">
          参照切れQuizはありません。
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="すべて選択"
                    checked={
                      allSelected
                        ? true
                        : selected.size > 0
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked === true
                          ? new Set(items.map((item) => item.quiz_id))
                          : new Set(),
                      )
                    }
                  />
                </TableHead>
                <TableHead>種類</TableHead>
                <TableHead>作成者</TableHead>
                <TableHead>参照切れ</TableHead>
                <TableHead>回答</TableHead>
                <TableHead>作成日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.quiz_id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`${item.quiz_id}を選択`}
                      checked={selected.has(item.quiz_id)}
                      onCheckedChange={(checked) =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (checked === true) next.add(item.quiz_id);
                          else next.delete(item.quiz_id);
                          return next;
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>{labels[item.quiz_type]}</TableCell>
                  <TableCell>{item.owner_email ?? "不明"}</TableCell>
                  <TableCell>{item.broken_reference_count}</TableCell>
                  <TableCell>{item.answer_count}</TableCell>
                  <TableCell>
                    {new Date(item.created).toLocaleString("ja-JP")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
