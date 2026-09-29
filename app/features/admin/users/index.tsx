import { Ban, Database, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "~/shared/components/ui/badge";
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
  type AdminResourceItem,
  type AdminUserItem,
  type ResourceDeletionImpact,
  deleteAdminResource,
  getAdminResourceDeletionImpact,
  listAdminUserResources,
  listAdminUsers,
  updateAdminUserStatus,
} from "./api";

export default function AdminUserManager() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [statusTarget, setStatusTarget] = useState<AdminUserItem>();
  const [resourceOwner, setResourceOwner] = useState<AdminUserItem>();
  const [resources, setResources] = useState<AdminResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [deletionImpact, setDeletionImpact] =
    useState<ResourceDeletionImpact>();
  const [confirmation, setConfirmation] = useState("");
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    listAdminUsers()
      .then(setUsers)
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "ユーザーを取得できませんでした。",
        ),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.email, user.display_name, user.username]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase().includes(normalized)),
    );
  }, [query, users]);

  async function changeStatus() {
    if (!statusTarget) return;
    setIsMutating(true);
    setError(undefined);
    try {
      const updated = await updateAdminUserStatus(
        statusTarget.uid,
        !statusTarget.is_active,
      );
      setUsers((current) =>
        current.map((user) => (user.uid === updated.uid ? updated : user)),
      );
      toast.success(
        updated.is_active ? "ユーザーを再開しました" : "ユーザーを停止しました",
      );
      setStatusTarget(undefined);
    } catch (mutationError) {
      setError(errorMessage(mutationError));
    } finally {
      setIsMutating(false);
    }
  }

  async function openResources(user: AdminUserItem) {
    setResourceOwner(user);
    setResources([]);
    setResourcesLoading(true);
    setError(undefined);
    try {
      setResources(await listAdminUserResources(user.uid));
    } catch (loadError) {
      setError(errorMessage(loadError));
      setResourceOwner(undefined);
    } finally {
      setResourcesLoading(false);
    }
  }

  async function inspectDeletion(resource: AdminResourceItem) {
    setConfirmation("");
    setIsMutating(true);
    setError(undefined);
    try {
      setDeletionImpact(await getAdminResourceDeletionImpact(resource.uid));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsMutating(false);
    }
  }

  async function removeResource() {
    if (!deletionImpact) return;
    setIsMutating(true);
    setError(undefined);
    try {
      const result = await deleteAdminResource(
        deletionImpact.resource_uid,
        confirmation,
      );
      setResources((current) =>
        current.filter(({ uid }) => uid !== result.resource_uid),
      );
      setUsers((current) =>
        current.map((user) =>
          user.uid === deletionImpact.owner_uid
            ? { ...user, resource_count: Math.max(0, user.resource_count - 1) }
            : user,
        ),
      );
      toast.success(
        `${result.deleted_sentence_count}件を削除、${result.retired_sentence_count}件を退役しました`,
      );
      setDeletionImpact(undefined);
      setConfirmation("");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">ユーザー管理</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          アカウントを停止・再開し、所有Resourceを影響範囲の確認後に削除できます。ユーザー自体は削除しません。
        </p>
      </section>

      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="メールアドレス・表示名で絞り込み"
        aria-label="ユーザーを絞り込み"
        className="max-w-md"
      />

      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">ユーザーを取得中…</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ユーザー</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>登録日</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="min-w-56 whitespace-normal">
                    <p className="font-medium">
                      {user.display_name || user.username || user.email}
                    </p>
                    {(user.display_name || user.username) && (
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant={user.is_active ? "secondary" : "destructive"}
                      >
                        {user.is_active ? "利用中" : "停止中"}
                      </Badge>
                      {user.is_superuser && <Badge>管理者</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{user.resource_count}</TableCell>
                  <TableCell>{formatDate(user.created)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void openResources(user)}
                      >
                        <Database />
                        Resource
                      </Button>
                      <Button
                        type="button"
                        variant={user.is_active ? "outline" : "secondary"}
                        size="sm"
                        disabled={user.is_superuser}
                        onClick={() => setStatusTarget(user)}
                      >
                        {user.is_active ? <Ban /> : <RotateCcw />}
                        {user.is_active ? "停止" : "再開"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ユーザーを{statusTarget?.is_active ? "停止" : "再開"}しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.is_active
                ? `${statusTarget.email} は直ちにAPIを利用できなくなります。データは削除されず、後から再開できます。`
                : `${statusTarget?.email} のログインとAPI利用を再開します。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating}
              onClick={(event) => {
                event.preventDefault();
                void changeStatus();
              }}
            >
              {statusTarget?.is_active ? "停止する" : "再開する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(resourceOwner)}
        onOpenChange={(open) => !open && setResourceOwner(undefined)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{resourceOwner?.email} のResource</DialogTitle>
            <DialogDescription>
              削除前に、Tanbun・Quiz・回答履歴への影響を確認します。
            </DialogDescription>
          </DialogHeader>
          {resourcesLoading ? (
            <p className="text-sm text-muted-foreground">取得中…</p>
          ) : resources.length === 0 ? (
            <p className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
              Resourceはありません。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Tanbun</TableHead>
                  <TableHead>更新日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.uid}>
                    <TableCell className="max-w-md whitespace-normal font-medium">
                      {resource.name}
                    </TableCell>
                    <TableCell>{resource.sentence_count}</TableCell>
                    <TableCell>{formatDate(resource.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isMutating}
                        onClick={() => void inspectDeletion(resource)}
                      >
                        <Trash2 />
                        削除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletionImpact)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletionImpact(undefined);
            setConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resourceを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  この操作は元に戻せません。Quiz・回答から参照されるTanbunは退役として保持されます。
                </p>
                {deletionImpact && (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border p-3 text-sm">
                    <Impact
                      label="Tanbun"
                      value={deletionImpact.sentence_count}
                    />
                    <Impact label="Term" value={deletionImpact.term_count} />
                    <Impact
                      label="関連Quiz"
                      value={deletionImpact.quiz_count}
                    />
                    <Impact
                      label="回答履歴"
                      value={deletionImpact.answer_count}
                    />
                    <Impact
                      label="物理削除"
                      value={deletionImpact.deleting_sentence_count}
                    />
                    <Impact
                      label="退役として保持"
                      value={deletionImpact.retiring_sentence_count}
                    />
                  </dl>
                )}
                <label
                  htmlFor="resource-delete-confirmation"
                  className="block space-y-2 text-foreground"
                >
                  <span className="text-sm">
                    確認のためResource名「{deletionImpact?.resource_name}
                    」を入力
                  </span>
                  <Input
                    id="resource-delete-confirmation"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="off"
                  />
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                isMutating || confirmation !== deletionImpact?.resource_name
              }
              onClick={(event) => {
                event.preventDefault();
                void removeResource();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              完全に削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Impact({ label, value }: { label: string; value: number }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ja-JP").format(new Date(value));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "管理操作に失敗しました。";
}
