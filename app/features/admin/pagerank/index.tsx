import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import {
  type PageRankJob,
  type PageRankResource,
  type PageRankSettings,
  pageRankRequest,
} from "./api";

const stateLabels = {
  ready: "計算済み",
  missing: "未計算",
  stale: "再計算が必要",
};
const jobLabels = {
  queued: "待機中",
  running: "計算中",
  completed: "完了",
  partial: "失敗あり",
};
const limits = {
  max_concurrent_jobs: ["同時実行ジョブ数", 1, 4],
  max_pending_jobs: ["受付上限（待機＋実行）", 1, 100],
  max_nodes: ["1リソースのノード上限", 1, 100000],
  max_edges: ["1リソースの辺上限", 1, 500000],
} as const;

export default function PageRankManager() {
  const resources = useSWR(
    "admin/pagerank/resources",
    () => pageRankRequest<PageRankResource[]>("resources"),
    { refreshInterval: 5000 },
  );
  const jobs = useSWR(
    "admin/pagerank/jobs",
    () => pageRankRequest<PageRankJob[]>("jobs"),
    { refreshInterval: 3000 },
  );
  const settings = useSWR("admin/pagerank/settings", () =>
    pageRankRequest<PageRankSettings>("settings"),
  );
  const [draft, setDraft] = useState<PageRankSettings>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);
  const visible =
    resources.data?.filter((r) =>
      r.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    ) ?? [];

  async function enqueue() {
    setBusy(true);
    setError(undefined);
    try {
      await pageRankRequest("jobs", "POST", { resource_ids: [...selected] });
      setSelected(new Set());
      await jobs.mutate();
    } catch (error) {
      setError(error instanceof Error ? error.message : "受付に失敗しました。");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      await settings.mutate(
        await pageRankRequest<PageRankSettings>("settings", "PUT", draft),
        false,
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "設定保存に失敗しました。",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <h2 className="text-lg font-semibold">PageRank 一括計算</h2>
      <p className="text-sm text-muted-foreground">
        取り込み済みのDBから計算します。各ジョブはリソースを1件ずつ処理し、画面を閉じても続きます。
        完了時に通知します。参照先・推論の前提を重視し、階層・並び順は除外。Power・XPは変わりません。
      </p>
      {(error || resources.error || jobs.error || settings.error) && (
        <p role="alert" className="text-sm text-destructive">
          {error ??
            "情報を取得できませんでした。時間を置いて再確認してください。"}
        </p>
      )}
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm">
          専用キューの負荷制御
        </summary>
        {draft && (
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            {(Object.keys(limits) as (keyof PageRankSettings)[]).map((key) => (
              <div
                key={key}
                className="grid grid-cols-[1fr_7rem] items-center gap-3"
              >
                <Label htmlFor={`pagerank-${key}`}>{limits[key][0]}</Label>
                <Input
                  id={`pagerank-${key}`}
                  type="number"
                  min={limits[key][1]}
                  max={limits[key][2]}
                  step={1}
                  required
                  disabled={saving}
                  value={draft[key]}
                  onChange={(event) =>
                    setDraft({ ...draft, [key]: Number(event.target.value) })
                  }
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              512MB環境では同時実行1を推奨。import・クイズ作成の制限とは独立しています。
            </p>
            <Button disabled={saving} type="submit">
              {saving ? "保存中…" : "設定を保存"}
            </Button>
          </form>
        )}
      </details>
      <section className="space-y-3">
        <h3 className="font-medium">計算対象</h3>
        <Input
          aria-label="リソースを絞り込む"
          placeholder="リソースを絞り込む"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Button
            variant="outline"
            onClick={() => setSelected(new Set(visible.map((r) => r.uid)))}
          >
            表示中をすべて選択
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              setSelected(
                new Set(
                  visible.filter((r) => r.state !== "ready").map((r) => r.uid),
                ),
              )
            }
          >
            未計算・更新分を選択
          </Button>
          <Button
            disabled={busy || selected.size === 0 || selected.size > 2000}
            onClick={() => void enqueue()}
          >
            {busy ? "受付中…" : `選択した${selected.size}件を計算`}
          </Button>
        </div>
        {!resources.data && !resources.error && (
          <p className="text-sm text-muted-foreground">対象を取得中…</p>
        )}
        <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
          {visible.map((r) => (
            <label
              key={r.uid}
              className="flex min-w-0 items-center gap-3 p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.has(r.uid)}
                onChange={(event) => {
                  const next = new Set(selected);
                  if (event.target.checked) next.add(r.uid);
                  else next.delete(r.uid);
                  setSelected(next);
                }}
              />
              <span className="min-w-0 flex-1 truncate" title={r.title}>
                {r.title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {stateLabels[r.state]}
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="font-medium">処理状況</h3>
        {jobs.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            まだジョブはありません。
          </p>
        )}
        {jobs.data?.map((job) => (
          <div
            key={job.uid}
            className="space-y-2 rounded-md border p-3 text-sm"
          >
            <div className="flex justify-between gap-3">
              <span>{jobLabels[job.status]}</span>
              <span>
                {job.completed} / {job.total}件
              </span>
            </div>
            <progress
              className="w-full"
              max={job.total}
              value={job.completed}
              aria-label="計算進捗"
            />
            {job.current_title && (
              <p className="truncate">計算中: {job.current_title}</p>
            )}
            {job.results.length > 0 && (
              <details>
                <summary className="cursor-pointer">
                  結果（失敗 {job.results.filter((r) => r.error).length}件）
                </summary>
                <ul className="mt-2 space-y-2">
                  {job.results.map((result) => (
                    <li key={result.resource_id}>
                      <span>
                        {result.title} — {result.error ? "失敗" : "完了"}
                      </span>
                      {result.error && (
                        <>
                          <p className="text-xs text-destructive">
                            {result.error}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelected(
                                (old) => new Set([...old, result.resource_id]),
                              )
                            }
                          >
                            再計算対象に追加
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
