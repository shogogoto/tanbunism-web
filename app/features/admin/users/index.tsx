import {
  ArrowRightLeft,
  Ban,
  Database,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { adventureAccessKey } from "~/features/game/access";
import { invalidateGamification } from "~/features/gamification/invalidate";
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
import UserDataTransfer from "./UserDataTransfer";
import {
  type AdminResourceItem,
  type AdminUserItem,
  type ResourceDeletionImpact,
  deleteAdminResource,
  deleteAdminUser,
  getAdminResourceDeletionImpact,
  grantAdminUser,
  listAdminUserResources,
  listAdminUsers,
  resetAdminUserAdventure,
  resetAdminUserPassword,
  updateAdminUserStatus,
} from "./api";

export default function AdminUserManager() {
  const { mutate } = useSWRConfig();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [statusTarget, setStatusTarget] = useState<AdminUserItem>();
  const [adminTarget, setAdminTarget] = useState<AdminUserItem>();
  const [adventureTarget, setAdventureTarget] = useState<AdminUserItem>();
  const [adminConfirmation, setAdminConfirmation] = useState("");
  const [resourceOwner, setResourceOwner] = useState<AdminUserItem>();
  const [passwordTarget, setPasswordTarget] = useState<AdminUserItem>();
  const [deleteTarget, setDeleteTarget] = useState<AdminUserItem>();
  const [transferSource, setTransferSource] = useState<AdminUserItem>();
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [userDeleteConfirmation, setUserDeleteConfirmation] = useState("");
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

  async function grantAdmin() {
    if (!adminTarget || adminConfirmation !== adminTarget.email) return;
    setIsMutating(true);
    setError(undefined);
    try {
      const updated = await grantAdminUser(adminTarget.uid, adminConfirmation);
      setUsers((current) =>
        current.map((user) => (user.uid === updated.uid ? updated : user)),
      );
      toast.success(`${updated.email} を管理者に設定しました`);
      setAdminTarget(undefined);
      setAdminConfirmation("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setIsMutating(false);
    }
  }

  async function resetAdventure() {
    if (!adventureTarget || isMutating) return;
    setIsMutating(true);
    setError(undefined);
    try {
      await resetAdminUserAdventure(adventureTarget.uid);
      await mutate(adventureAccessKey(adventureTarget.uid)).catch(
        () => undefined,
      );
      toast.success(`${adventureTarget.email} の冒険待ち時間を解除しました`);
      setAdventureTarget(undefined);
    } catch (cause) {
      setError(errorMessage(cause));
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

  async function changePassword() {
    if (!passwordTarget || newPassword !== passwordConfirmation) return;
    setIsMutating(true);
    setError(undefined);
    try {
      await resetAdminUserPassword(passwordTarget.uid, newPassword);
      toast.success(`${passwordTarget.email} のパスワードを変更しました`);
      setPasswordTarget(undefined);
      setNewPassword("");
      setPasswordConfirmation("");
    } catch (mutationError) {
      setError(errorMessage(mutationError));
    } finally {
      setIsMutating(false);
    }
  }

  async function removeUser() {
    if (!deleteTarget) return;
    setIsMutating(true);
    setError(undefined);
    try {
      const result = await deleteAdminUser(
        deleteTarget.uid,
        userDeleteConfirmation,
      );
      setUsers((current) =>
        current.filter((user) => user.uid !== result.user_id),
      );
      toast.success(
        `${deleteTarget.email} と Resource ${result.deleted_resource_count}件を削除しました`,
      );
      setDeleteTarget(undefined);
      setUserDeleteConfirmation("");
    } catch (mutationError) {
      setError(errorMessage(mutationError));
    } finally {
      setIsMutating(false);
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
          管理者の設定、冒険待ち時間の解除、アカウントの停止・再開、パスワード再設定、所有データを含む削除を行います。
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
                        disabled={
                          user.is_superuser || !user.is_active || isMutating
                        }
                        aria-label={`${user.email}を管理者に設定`}
                        onClick={() => {
                          setAdminTarget(user);
                          setAdminConfirmation("");
                        }}
                      >
                        <ShieldCheck /> 管理者にする
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={`${user.email}のデータを移行`}
                        onClick={() => setTransferSource(user)}
                      >
                        <ArrowRightLeft /> データ移行
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isMutating || !user.is_active}
                        aria-label={`${user.email}の冒険待ち時間を解除`}
                        onClick={() => setAdventureTarget(user)}
                      >
                        <RotateCcw /> 冒険を可能に
                      </Button>
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
                        variant="outline"
                        size="sm"
                        disabled={user.is_superuser}
                        onClick={() => setPasswordTarget(user)}
                      >
                        <KeyRound />
                        パスワード
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="ユーザーを削除"
                        aria-label={`${user.email}を削除`}
                        disabled={user.is_superuser}
                        onClick={() => setDeleteTarget(user)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 />
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
        open={Boolean(adventureTarget)}
        onOpenChange={(open) => !open && setAdventureTarget(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>冒険待ち時間を解除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {adventureTarget?.email}{" "}
              がすぐに冒険を開始・再開できるようにします。HP・攻略状況・復習XPは変更しません。冒険権は蓄積しません。
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
                void resetAdventure();
              }}
            >
              待ち時間を解除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {transferSource && (
        <UserDataTransfer
          source={transferSource}
          users={users}
          onClose={() => setTransferSource(undefined)}
          onTransferred={async () => {
            await invalidateGamification(mutate);
            setUsers(await listAdminUsers());
          }}
        />
      )}

      <AlertDialog
        open={Boolean(adminTarget)}
        onOpenChange={(open) => {
          if (!open && !isMutating) {
            setAdminTarget(undefined);
            setAdminConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>管理者に設定しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {adminTarget?.email}{" "}
              に、全ユーザーのデータ管理・削除や管理者の追加を行う権限を付与します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label htmlFor="admin-role-confirmation" className="space-y-2">
            <span className="text-sm">
              確認のため対象ユーザーのメールアドレスを入力
            </span>
            <Input
              id="admin-role-confirmation"
              value={adminConfirmation}
              onChange={(event) => setAdminConfirmation(event.target.value)}
              autoComplete="off"
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutating || adminConfirmation !== adminTarget?.email}
              onClick={(event) => {
                event.preventDefault();
                void grantAdmin();
              }}
            >
              管理者に設定する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        open={Boolean(passwordTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordTarget(undefined);
            setNewPassword("");
            setPasswordConfirmation("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>パスワードを再設定</DialogTitle>
            <DialogDescription>
              {passwordTarget?.email} に新しいパスワードを設定します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label htmlFor="admin-new-password" className="block space-y-2">
              <span className="text-sm font-medium">新しいパスワード</span>
              <Input
                id="admin-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={3}
                maxLength={100}
                autoComplete="new-password"
              />
            </label>
            <label
              htmlFor="admin-new-password-confirmation"
              className="block space-y-2"
            >
              <span className="text-sm font-medium">
                新しいパスワード（確認）
              </span>
              <Input
                id="admin-new-password-confirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                minLength={3}
                maxLength={100}
                autoComplete="new-password"
              />
            </label>
            {passwordConfirmation && newPassword !== passwordConfirmation && (
              <p className="text-sm text-destructive">
                パスワードが一致しません。
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isMutating}
                onClick={() => setPasswordTarget(undefined)}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                disabled={
                  isMutating ||
                  newPassword.length < 3 ||
                  newPassword !== passwordConfirmation
                }
                onClick={() => void changePassword()}
              >
                変更する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(undefined);
            setUserDeleteConfirmation("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ユーザーを完全に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Resource、作成Quiz、回答履歴、学習計画、通知も削除されます。この操作は元に戻せません。
                </p>
                <label
                  htmlFor="admin-user-delete-confirmation"
                  className="block space-y-2 text-foreground"
                >
                  <span className="text-sm">
                    確認のため「{deleteTarget?.email}」を入力
                  </span>
                  <Input
                    id="admin-user-delete-confirmation"
                    aria-label="削除するユーザーのメールアドレス"
                    value={userDeleteConfirmation}
                    onChange={(event) =>
                      setUserDeleteConfirmation(event.target.value)
                    }
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
                isMutating || userDeleteConfirmation !== deleteTarget?.email
              }
              onClick={(event) => {
                event.preventDefault();
                void removeUser();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              ユーザーを削除する
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
