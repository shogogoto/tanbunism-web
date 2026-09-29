import { RefreshCw, Trash2 } from "lucide-react";
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
  type OrphanReason,
  type OrphanedTanbun,
  deleteOrphanedTanbuns,
  listOrphanedTanbuns,
} from "./api";

const reasonLabels: Record<OrphanReason, string> = {
  missing_resource: "Resourceなし",
  missing_owner: "所有者なし",
  missing_location: "配置なし",
};

export default function OrphanedTanbunManager() {
  const [items, setItems] = useState<OrphanedTanbun[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const loaded = await listOrphanedTanbuns();
      setItems(loaded);
      setSelected((current) => {
        const loadedIds = new Set(loaded.map(({ uid }) => uid));
        return new Set([...current].filter((id) => loadedIds.has(id)));
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "孤立単文を取得できませんでした。",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedItems = useMemo(
    () => items.filter(({ uid }) => selected.has(uid)),
    [items, selected],
  );
  const protectedCount = selectedItems.filter(
    (item) => item.quiz_reference_count > 0 || item.answer_reference_count > 0,
  ).length;
  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(items.map(({ uid }) => uid)) : new Set());
  }

  function toggleOne(uid: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(uid);
      else next.delete(uid);
      return next;
    });
  }

  async function removeSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setIsDeleting(true);
    setError(undefined);
    try {
      const result = await deleteOrphanedTanbuns(ids);
      toast.success(
        `${result.deleted_count}件を削除、${result.retired_count}件を退役しました`,
      );
      setSelected(new Set());
      await load();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "孤立単文を削除できませんでした。",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">孤立Tanbun</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Resource内の配置を解決できない現行Tanbunを監査します。自動削除はせず、内容と参照状況を確認してから手動で掃除します。
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "検出中…" : `${items.length}件を検出`}
          {selected.size > 0 && ` · ${selected.size}件を選択`}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={isLoading || isDeleting}
          >
            <RefreshCw className={isLoading ? "animate-spin" : undefined} />
            再検出
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={selected.size === 0 || isDeleting}
              >
                <Trash2 />
                選択した項目を掃除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {selected.size}件の孤立Tanbunを掃除しますか？
                </AlertDialogTitle>
                <AlertDialogDescription>
                  参照のない{selected.size - protectedCount}
                  件は物理削除します。クイズまたは回答履歴から参照されている
                  {protectedCount}
                  件は、復旧できるよう退役Tanbunとして保持します。実行直前に孤立状態を再確認し、修復済みの項目はスキップします。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void removeSelected()}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  掃除する
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

      {!isLoading && items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">孤立Tanbunはありません</p>
          <p className="mt-1 text-sm text-muted-foreground">
            現在のグラフには掃除が必要なTanbunは見つかりませんでした。
          </p>
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
                    onCheckedChange={(checked) => toggleAll(checked === true)}
                  />
                </TableHead>
                <TableHead>Tanbun</TableHead>
                <TableHead>元Resource</TableHead>
                <TableHead>原因</TableHead>
                <TableHead>参照</TableHead>
                <TableHead className="text-right">関係数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.uid}
                  data-state={selected.has(item.uid) ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      aria-label={`${item.sentence}を選択`}
                      checked={selected.has(item.uid)}
                      onCheckedChange={(checked) =>
                        toggleOne(item.uid, checked === true)
                      }
                    />
                  </TableCell>
                  <TableCell className="min-w-64 max-w-xl whitespace-normal">
                    <p>{item.sentence}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {item.uid}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal">
                    <p>{item.resource_name ?? "不明"}</p>
                    {item.owner_email && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.owner_email}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{reasonLabels[item.reason]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant={
                          item.quiz_reference_count > 0
                            ? "secondary"
                            : "outline"
                        }
                      >
                        Quiz {item.quiz_reference_count}
                      </Badge>
                      <Badge
                        variant={
                          item.answer_reference_count > 0
                            ? "secondary"
                            : "outline"
                        }
                      >
                        回答 {item.answer_reference_count}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.relationship_count}
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
