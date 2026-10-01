import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import BrokenQuizRepairDialog from "./BrokenQuizRepairDialog";
import {
  type BrokenQuizReference,
  deleteQuiz,
  deleteQuizzes,
  listBrokenQuizReferences,
} from "./api";

const labels: Record<BrokenQuizReference["quiz_type"], string> = {
  term2sent: "用語→単文",
  sent2term: "単文→用語",
  rel2pair: "関係→ペア",
  pair2rel: "ペア→関係",
};

export default function BrokenQuizManager() {
  const [items, setItems] = useState<BrokenQuizReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState<string>();
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const references = await listBrokenQuizReferences();
      setItems(references);
      setSelected(new Set());
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

  const groups = useMemo(() => {
    const result = new Map<string, BrokenQuizReference[]>();
    for (const item of items) {
      const group = result.get(item.quiz_id) ?? [];
      group.push(item);
      result.set(item.quiz_id, group);
    }
    return [...result.values()];
  }, [items]);

  async function remove(quizId: string) {
    setDeleting(quizId);
    try {
      await deleteQuiz(quizId);
      setItems((current) => current.filter((item) => item.quiz_id !== quizId));
      toast.success("参照切れクイズを削除しました");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "クイズを削除できませんでした。",
      );
    } finally {
      setDeleting(undefined);
    }
  }

  async function removeSelected() {
    setIsBulkDeleting(true);
    setError(undefined);
    try {
      await deleteQuizzes([...selected]);
      setItems((current) =>
        current.filter((item) => !selected.has(item.quiz_id)),
      );
      toast.success(`${selected.size}件の参照切れクイズを削除しました`);
      setSelected(new Set());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "選択したクイズを削除できませんでした。",
      );
    } finally {
      setIsBulkDeleting(false);
    }
  }

  if (loading)
    return (
      <p className="text-sm text-muted-foreground">参照切れクイズを確認中…</p>
    );
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (groups.length === 0)
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">参照切れクイズはありません</p>
        <p className="mt-1 text-sm text-muted-foreground">
          退役したTanbunを参照しているQuizは見つかりませんでした。
        </p>
      </div>
    );

  return (
    <section className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          元の単文が退役しています。RELクイズは意味を推測して自動修復せず、再作成または削除してください。
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={
                groups.length > 0 &&
                groups.every(([first]) => selected.has(first.quiz_id))
              }
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? new Set(groups.map(([first]) => first.quiz_id))
                    : new Set(),
                )
              }
            />
            すべて選択
          </label>
          {selected.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="ml-auto"
                >
                  {selected.size}件を削除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    選択した{selected.size}件を削除しますか？
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    対象クイズと紐づく回答履歴をまとめて削除します。元のResourceは変更しません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isBulkDeleting}
                    onClick={() => void removeSelected()}
                  >
                    {isBulkDeleting ? "削除中…" : "まとめて削除する"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {groups.map((references) => {
        const first = references[0];
        return (
          <div
            key={first.quiz_id}
            className="flex items-start justify-between gap-3 border-t pt-3 text-sm"
          >
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0"
              checked={selected.has(first.quiz_id)}
              aria-label={`参照切れクイズを選択: ${first.quiz_id}`}
              onChange={(event) =>
                setSelected((current) => {
                  const next = new Set(current);
                  if (event.target.checked) next.add(first.quiz_id);
                  else next.delete(first.quiz_id);
                  return next;
                })
              }
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{labels[first.quiz_type]}</Badge>
                <span className="text-muted-foreground">{first.quiz_id}</span>
              </div>
              <Link
                to={`/resource/${first.resource_id}`}
                className="block truncate text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {first.resource_name ??
                  `削除済みResource (${first.resource_id})`}
              </Link>
              {references.map((reference) => (
                <div
                  key={reference.retired_sentence_id}
                  className="flex items-center gap-2"
                >
                  <p className="min-w-0 flex-1 truncate text-muted-foreground">
                    {reference.roles.join(" / ")}: {reference.retired_value}
                  </p>
                  <BrokenQuizRepairDialog
                    reference={reference}
                    resourceName={reference.resource_name ?? undefined}
                    onRepaired={load}
                  />
                </div>
              ))}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deleting === first.quiz_id}
                >
                  <Trash2 /> 削除
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    参照切れクイズを削除しますか？
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    このクイズと、紐づく回答履歴を削除します。元の単文は変更しません。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void remove(first.quiz_id)}>
                    削除する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      })}
    </section>
  );
}
