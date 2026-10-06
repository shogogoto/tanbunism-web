import { Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { useSWRConfig } from "swr";
import { transformToTreeData } from "~/features/namespace/components/NamespaceExplorer";
import type { ExplorerTreeDataItem } from "~/features/namespace/components/types";
import { invalidateQuizCache } from "~/features/quiz/cache";
import Loading from "~/shared/components/Loading";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import { useGetNamaspaceNamespaceGet } from "~/shared/generated/entry/entry";
import { genericCache } from "~/shared/lib/indexed";
import { PERSONAL_TIMELINE_CACHE_KEY } from "./PersonalTimeline";
import {
  type ReviewSettings,
  defaultSettings,
  reviewPriorities,
  settingsRequest,
  useReviewSettings,
} from "./settings";

function flattenResources(
  items: ExplorerTreeDataItem[],
): ExplorerTreeDataItem[] {
  return items.flatMap((item) =>
    item.isResource ? [item] : flattenResources(item.children ?? []),
  );
}

export default function ReviewSettingsManager() {
  const inputId = useId();
  const { mutate: mutateGlobal } = useSWRConfig();
  const { data, error, isLoading, mutate } = useReviewSettings();
  const [draft, setDraft] = useState<ReviewSettings>();
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [resourceQuery, setResourceQuery] = useState("");
  const namespace = useGetNamaspaceNamespaceGet({
    fetch: { credentials: "include" },
    swr: { enabled: Boolean(draft) },
  });
  const resources = namespace.data?.data
    ? flattenResources(transformToTreeData(namespace.data.data))
    : [];
  const filtered = resources.filter((r) =>
    r.name.toLocaleLowerCase().includes(resourceQuery.toLocaleLowerCase()),
  );

  async function rebuild(profileId: string) {
    await settingsRequest(`/${profileId}/rebuild`, { method: "POST" });
    await Promise.all([
      genericCache.deletePrefix(`${PERSONAL_TIMELINE_CACHE_KEY}:${profileId}:`),
      invalidateQuizCache("daily-quizzes"),
    ]);
    await mutateGlobal(
      (key) =>
        Array.isArray(key) &&
        ((key[0] === "dashboard-personal-timeline" && key[1] === profileId) ||
          (key[0] === "daily-quiz-timeline" && key[2] === profileId)),
    );
  }

  async function act(operation: () => Promise<unknown>, success: string) {
    setBusy(true);
    setActionError("");
    setMessage("");
    try {
      await operation();
      await mutate();
      setMessage(success);
      return true;
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "処理に失敗しました。",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <Loading />;
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          設定ごとの今日のセットを、復習画面で切り替えられます。
        </p>
        <Button
          size="icon"
          className="shrink-0 rounded-full"
          aria-label="復習設定を追加"
          disabled={busy}
          onClick={() => {
            setDraft({ ...defaultSettings, name: "" });
            setIsNew(true);
            setResourceQuery("");
          }}
        >
          <Plus />
        </Button>
      </div>
      {(actionError || error) && (
        <p role="alert" className="text-sm text-destructive">
          {actionError ||
            (error instanceof Error
              ? error.message
              : "設定を取得できませんでした。")}
        </p>
      )}
      {message && (
        <output className="block text-sm text-muted-foreground">
          {message}
        </output>
      )}
      <div className="divide-y border-y">
        {data?.map((setting) => (
          <div
            key={setting.id}
            className="flex flex-wrap items-center gap-2 py-3 outline-none data-[hotkey-active=true]:bg-accent/40 data-[hotkey-active=true]:ring-1 data-[hotkey-active=true]:ring-primary"
            data-hotkey-item
            tabIndex={-1}
            onKeyDown={(event) => {
              if (
                event.target === event.currentTarget &&
                event.key === "Enter"
              ) {
                event.preventDefault();
                event.currentTarget
                  .querySelector<HTMLAnchorElement>("a")
                  ?.click();
              }
            }}
          >
            <Link
              className="min-w-0 flex-1 hover:underline"
              to={`/review?preset=${setting.id}`}
            >
              <p className="truncate font-medium">{setting.name}</p>
              <p className="text-xs text-muted-foreground">
                {setting.resource_ids
                  ? `${setting.resource_ids.length}リソース`
                  : "全リソース"}{" "}
                · 知識 {setting.tanbun_count}件 · クイズ {setting.quiz_count}問
                · {reviewPriorities[setting.priority]}
              </p>
            </Link>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`${setting.name}を編集`}
              disabled={busy}
              onClick={() => {
                setDraft(setting);
                setIsNew(false);
                setResourceQuery("");
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "今日の推薦セットを最新設定で作り直します。見たよ・回答の記録は残ります。",
                  )
                )
                  void act(
                    () => rebuild(setting.id),
                    "今日のセットを作り直しました。復習画面を開いて確認できます。",
                  );
              }}
            >
              今日を作り直す
            </Button>
            {setting.id !== "default" && (
              <Button
                size="icon"
                variant="ghost"
                aria-label={`${setting.name}を削除`}
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `「${setting.name}」の設定を削除します。復習記録は消えません。`,
                    )
                  )
                    void act(
                      () =>
                        settingsRequest(`/${setting.id}`, { method: "DELETE" }),
                      "設定を削除しました。",
                    );
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Dialog
        open={Boolean(draft)}
        onOpenChange={(open) => {
          if (!open && !busy) setDraft(undefined);
        }}
      >
        <DialogContent
          className="max-h-[85dvh] min-w-0 overflow-y-auto p-4 sm:max-w-2xl sm:p-6"
          data-dashboard-swipe-ignore
        >
          <DialogHeader>
            <DialogTitle>
              {isNew ? "復習設定を追加" : "復習設定を編集"}
            </DialogTitle>
            <DialogDescription>
              開始済みの今日のセットは維持し、変更は翌日から反映します。
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <form
              className="min-w-0 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                const { id, ...body } = draft;
                if (
                  await act(
                    () =>
                      settingsRequest(isNew ? "" : `/${id}`, {
                        method: isNew ? "POST" : "PUT",
                        body: JSON.stringify(body),
                      }),
                    "保存しました。開始済みの今日のセットは変わらず、変更は翌日から反映します。",
                  )
                )
                  setDraft(undefined);
              }}
            >
              <label
                htmlFor={`${inputId}-name`}
                className="block space-y-1 text-sm"
              >
                設定名
                <Input
                  id={`${inputId}-name`}
                  required
                  maxLength={64}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  htmlFor={`${inputId}-tanbuns`}
                  className="space-y-1 text-sm"
                >
                  一日の知識件数
                  <Input
                    id={`${inputId}-tanbuns`}
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={draft.tanbun_count}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        tanbun_count: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label
                  htmlFor={`${inputId}-quizzes`}
                  className="space-y-1 text-sm"
                >
                  一日のクイズ数
                  <Input
                    id={`${inputId}-quizzes`}
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={draft.quiz_count}
                    onChange={(e) =>
                      setDraft({ ...draft, quiz_count: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <label className="block space-y-1 text-sm">
                優先方針
                <select
                  className="h-9 w-full rounded-md border bg-background px-2"
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      priority: e.target.value as ReviewSettings["priority"],
                    })
                  }
                >
                  {Object.entries(reviewPriorities).map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-muted-foreground">
                リソースを分散して選びます。「苦手・久しぶり」はクイズの不正解・低正答率、知識では接触が少なく間隔の空いた単文を優先します。件数は上限で、候補が少なければ少なくなります。
              </p>
              <fieldset className="min-w-0 space-y-2">
                <legend className="text-sm">対象リソース</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.resource_ids === null}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        resource_ids: e.target.checked ? null : [],
                      })
                    }
                  />
                  すべて
                </label>
                {draft.resource_ids !== null && (
                  <>
                    <Input
                      aria-label="対象リソースを絞り込む"
                      value={resourceQuery}
                      onChange={(e) => setResourceQuery(e.target.value)}
                    />
                    {namespace.isLoading && <Loading />}
                    {namespace.error && (
                      <p role="alert">リソースを取得できませんでした。</p>
                    )}
                    <div className="max-h-64 min-w-0 space-y-2 overflow-y-auto rounded border p-2">
                      {filtered.map((r) => (
                        <label
                          key={r.id}
                          className="flex min-w-0 items-start gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 shrink-0"
                            checked={draft.resource_ids?.includes(r.id)}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                resource_ids: e.target.checked
                                  ? [...(draft.resource_ids ?? []), r.id]
                                  : (draft.resource_ids?.filter(
                                      (id) => id !== r.id,
                                    ) ?? []),
                              })
                            }
                          />
                          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                            {r.name}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {draft.resource_ids.length}件選択
                    </p>
                  </>
                )}
              </fieldset>
              {actionError && (
                <p role="alert" className="text-sm text-destructive">
                  {actionError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setDraft(undefined)}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={
                    busy ||
                    !draft.name.trim() ||
                    draft.resource_ids?.length === 0
                  }
                >
                  保存
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
