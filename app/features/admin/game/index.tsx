import { ArrowDown, ArrowUp, ChevronsUpDown, Swords } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
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
} from "~/shared/components/ui/alert-dialog";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/shared/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/shared/components/ui/tabs";
import BattleSettingsManager from "../battle";
import {
  type AdminGameDungeon,
  listAdminGameDungeons,
  rebuildAdminDungeonEnemies,
} from "./api";

type SortKey =
  | "user_email"
  | "resource_name"
  | "status"
  | "region_count"
  | "quiz_count";
type SortState = { key: SortKey; direction: "ascending" | "descending" };

const statusNames: Record<string, string> = {
  path: "攻略中",
  rest: "休憩中",
  defeated: "敗北",
  cleared: "攻略済み",
  battle: "戦闘中",
  母集団あり: "母集団あり",
};

function SortHeader({
  label,
  name,
  sort,
  onSort,
  className,
}: {
  label: string;
  name: SortKey;
  sort?: SortState;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort?.key === name;
  const Icon = !active
    ? ChevronsUpDown
    : sort.direction === "ascending"
      ? ArrowUp
      : ArrowDown;
  return (
    <TableHead
      aria-sort={active ? sort.direction : "none"}
      className={className}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
        onClick={() => onSort(name)}
      >
        {label}
        <Icon aria-hidden="true" className="size-3" />
      </button>
    </TableHead>
  );
}

function GameDungeonManager() {
  const [items, setItems] = useState<AdminGameDungeon[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({
    key: "user_email",
    direction: "ascending",
  });
  const [target, setTarget] = useState<AdminGameDungeon>();
  const [poolTarget, setPoolTarget] = useState<AdminGameDungeon>();
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setItems(await listAdminGameDungeons());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "ダンジョン一覧を取得できませんでした。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const matches = normalized
      ? items.filter((item) =>
          [item.user_email, item.resource_name, item.status].some((value) =>
            value.toLocaleLowerCase().includes(normalized),
          ),
        )
      : items;
    return [...matches].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), "ja");
      return sort.direction === "ascending" ? comparison : -comparison;
    });
  }, [items, query, sort]);

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }

  async function rebuild() {
    if (!target || mutating) return;
    setMutating(true);
    setError(undefined);
    try {
      const result = await rebuildAdminDungeonEnemies(
        target.user_id,
        target.resource_id,
      );
      if (result.preparing) {
        toast.success(
          "クイズをStudyPlanで準備しています。完了後に母集団と敵セットを自動更新します。",
        );
        setTarget(undefined);
        return;
      }
      toast.success(
        result.region_count
          ? `${result.region_count}領域・クイズ${result.quiz_count}問の母集団と敵セットを再選出しました`
          : "再構築できる母集団がありません",
      );
      setTarget(undefined);
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "再構築に失敗しました。",
      );
    } finally {
      setMutating(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">ダンジョン母集団</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ユーザーごとのダンジョンと、領域別に固定されたクイズ母集団を管理します。
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void refresh()}>
          更新
        </Button>
      </div>
      <Input
        aria-label="ユーザーまたはダンジョンを検索"
        placeholder="ユーザー名・ダンジョン名で検索"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {loading ? (
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table aria-label="ダンジョン母集団">
            <TableHeader>
              <TableRow>
                <SortHeader
                  label="ユーザー"
                  name="user_email"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="ダンジョン"
                  name="resource_name"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="状態"
                  name="status"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="領域"
                  name="region_count"
                  sort={sort}
                  onSort={toggleSort}
                  className="text-right"
                />
                <SortHeader
                  label="クイズ"
                  name="quiz_count"
                  sort={sort}
                  onSort={toggleSort}
                  className="text-right"
                />
                <TableHead scope="col" className="text-right">
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={`${item.user_id}:${item.resource_id}`}>
                  <TableCell className="whitespace-nowrap">
                    {item.user_email}
                  </TableCell>
                  <TableCell
                    className="max-w-64 truncate"
                    title={item.resource_name}
                  >
                    {item.resource_name}
                  </TableCell>
                  <TableCell>
                    {statusNames[item.status] ?? item.status}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.region_count}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.quiz_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!item.regions.length}
                        onClick={() => setPoolTarget(item)}
                      >
                        母集団を確認
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          mutating ||
                          item.status === "battle" ||
                          item.status === "母集団あり" ||
                          item.region_count === 0
                        }
                        onClick={() => setTarget(item)}
                      >
                        <Swords /> 母集団・敵を再選出
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {items.length
                      ? "検索条件に一致するダンジョンはありません。"
                      : "ダンジョンはありません。"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <AlertDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && !mutating && setTarget(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              このダンジョンの母集団を再選出しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.user_email} · {target?.resource_name}
              。準備済みクイズから領域ごとの母集団を重複なく選び直し、敵セットも作り直します。攻略状況・HP・復習履歴は変更しません。戦闘中は実行できません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutating}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={mutating}
              onClick={(event) => {
                event.preventDefault();
                void rebuild();
              }}
            >
              再選出する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(poolTarget)}
        onOpenChange={(open) => !open && setPoolTarget(undefined)}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>領域ごとのクイズ母集団</DialogTitle>
            <DialogDescription>
              {poolTarget?.user_email} · {poolTarget?.resource_name}
              。敵の出題元として固定されているクイズです。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {poolTarget?.regions.map((region) => (
              <section key={region.level} className="space-y-2">
                <h3 className="text-sm font-semibold">
                  領域 {region.level} · {region.quizzes.length}問
                </h3>
                {region.quizzes.length ? (
                  <ol className="list-decimal space-y-2 pl-5">
                    {region.quizzes.map((quiz) => (
                      <li key={quiz.quiz_id} className="text-sm">
                        <span className="text-xs text-muted-foreground">
                          {quiz.quiz_type}
                        </span>
                        <p>{quiz.statement || "問題文なし"}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    スナップショットにクイズ本文がありません。
                  </p>
                )}
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function GameAdminManager() {
  const { subtab } = useParams();
  const navigate = useNavigate();
  const activeTab = subtab === "dungeons" ? "dungeons" : "balance";
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => navigate(`/admin/game/${value}`)}
      className="gap-0"
    >
      <div className="flex justify-center border-b px-4 py-2">
        <TabsList className="h-auto flex-wrap justify-center">
          <TabsTrigger value="balance">ゲームバランス</TabsTrigger>
          <TabsTrigger value="dungeons">ダンジョン母集団</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="balance" className="mt-0">
        <BattleSettingsManager />
      </TabsContent>
      <TabsContent value="dungeons" className="mt-0">
        <GameDungeonManager />
      </TabsContent>
    </Tabs>
  );
}
