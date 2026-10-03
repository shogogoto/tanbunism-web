import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import Loading from "~/shared/components/Loading";
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
  type QuizType,
  type UnplannedQuiz,
  deleteQuizzes,
  listUnplannedQuizzes,
} from "./api";

const labels: Record<QuizType, string> = {
  term2sent: "用語→単文",
  sent2term: "単文→用語",
  rel2pair: "関係→ペア",
  pair2rel: "ペア→関係",
};

export default function UnplannedQuizManager() {
  const [items, setItems] = useState<UnplannedQuiz[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setItems(await listUnplannedQuizzes());
      setSelected(new Set());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "StudyPlan未所属クイズを取得できませんでした。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  async function removeSelected() {
    setDeleting(true);
    setError(undefined);
    try {
      await deleteQuizzes([...selected]);
      setItems((current) =>
        current.filter(({ quiz_id }) => !selected.has(quiz_id)),
      );
      toast.success(`${selected.size}件の未所属クイズを削除しました`);
      setSelected(new Set());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "選択したクイズを削除できませんでした。",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <Loading />;
  }
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (items.length === 0) return null;

  return (
    <section className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
      <div>
        <h2 className="font-medium">StudyPlan未所属クイズ</h2>
        <p className="text-sm text-muted-foreground">
          所有するStudyPlanのResourceとクイズ形式に一致しないクイズです。
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={items.length > 0 && selected.size === items.length}
            onChange={(event) =>
              setSelected(
                event.target.checked
                  ? new Set(items.map(({ quiz_id }) => quiz_id))
                  : new Set(),
              )
            }
          />
          すべて選択
        </label>
        {selected.size > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="ml-auto">
                {selected.size}件を削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  選択した{selected.size}件を削除しますか？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  対象クイズと回答履歴を削除します。ResourceとStudyPlanは変更しません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  onClick={() => void removeSelected()}
                >
                  {deleting ? "削除中…" : "まとめて削除する"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {items.map((item) => (
        <div
          key={item.quiz_id}
          className="flex min-w-0 items-center gap-3 border-t pt-3 text-sm"
        >
          <input
            type="checkbox"
            checked={selected.has(item.quiz_id)}
            aria-label={`未所属クイズを選択: ${item.quiz_id}`}
            onChange={(event) =>
              setSelected((current) => {
                const next = new Set(current);
                if (event.target.checked) next.add(item.quiz_id);
                else next.delete(item.quiz_id);
                return next;
              })
            }
          />
          <Badge variant="outline">{labels[item.quiz_type]}</Badge>
          <Link
            to={`/resource/${item.resource_id}`}
            className="min-w-0 truncate underline underline-offset-4 hover:text-foreground"
          >
            {item.resource_name ?? `Resource (${item.resource_id})`}
          </Link>
        </div>
      ))}
    </section>
  );
}
