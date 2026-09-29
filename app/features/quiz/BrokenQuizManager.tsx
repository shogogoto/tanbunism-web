import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  type BrokenQuizReference,
  deleteQuiz,
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setItems(await listBrokenQuizReferences());
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

  if (loading)
    return (
      <p className="text-sm text-muted-foreground">参照切れクイズを確認中…</p>
    );
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (groups.length === 0) return null;

  return (
    <section className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <div>
        <h2 className="font-semibold">参照切れクイズ</h2>
        <p className="text-sm text-muted-foreground">
          元の単文が退役しています。RELクイズは意味を推測して自動修復せず、再作成または削除してください。
        </p>
      </div>
      {groups.map((references) => {
        const first = references[0];
        return (
          <div
            key={first.quiz_id}
            className="flex items-start justify-between gap-3 border-t pt-3 text-sm"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{labels[first.quiz_type]}</Badge>
                <span className="text-muted-foreground">{first.quiz_id}</span>
              </div>
              {references.map((reference) => (
                <p
                  key={reference.retired_sentence_id}
                  className="truncate text-muted-foreground"
                >
                  {reference.roles.join(" / ")}: {reference.retired_value}
                </p>
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
