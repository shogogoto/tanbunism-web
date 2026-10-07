import { BookOpen, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import PowerBreakdown from "~/features/gamification/PowerBreakdown";
import type {
  Growth,
  GrowthResult,
} from "~/features/gamification/ResourceGrowth";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import { Progress } from "~/shared/components/ui/progress";
import type { MResource, NameSpace } from "~/shared/generated/fastAPI.schemas";
import { formatRelativeDate } from "~/shared/lib/formatRelativeDate";

const uidKey = (id: string) => id.replaceAll("-", "").toLowerCase();
const rowLayout =
  "grid grid-cols-[2.75rem_3.75rem_minmax(0,1fr)] md:grid-cols-[2.75rem_3.75rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_5.25rem_5.25rem] items-center gap-x-3";

export function shelfResources(namespace: NameSpace): MResource[] {
  const resources = new Map<string, MResource>();
  for (const node of namespace.g?.nodes ?? []) {
    const entry = node.id as unknown as MResource;
    if (entry?.uid && "authors" in entry && "published" in entry)
      resources.set(uidKey(entry.uid), entry);
  }
  return [...resources.values()];
}

export default function ResourceShelf({
  namespace,
  growth,
  loading,
  error,
  own,
  onRetry,
}: {
  namespace: NameSpace;
  growth?: GrowthResult;
  loading: boolean;
  error?: Error;
  own: boolean;
  onRetry: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const summary = useMemo(() => {
    const stats = Object.values(namespace.stats ?? {});
    return [
      ["単文", stats.reduce((sum, item) => sum + item.n_sentence, 0)],
      ["用語", stats.reduce((sum, item) => sum + item.n_term, 0)],
      ["文字", stats.reduce((sum, item) => sum + item.n_char, 0)],
    ] as const;
  }, [namespace.stats]);
  const books = useMemo(() => {
    const progress = new Map(
      growth?.resources.map((item) => [uidKey(item.resource_id), item]),
    );
    return shelfResources(namespace)
      .map((resource) => ({
        resource,
        growth: progress.get(uidKey(resource.uid)),
      }))
      .filter(({ resource }) =>
        [resource.name, ...(resource.authors ?? [])]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
      )
      .sort((a, b) => {
        const primary =
          sort === "power"
            ? (b.growth?.power ?? -1) - (a.growth?.power ?? -1)
            : sort === "xp"
              ? (b.growth?.total_xp ?? -1) - (a.growth?.total_xp ?? -1)
              : sort === "recent"
                ? (b.growth?.last_reviewed_on ?? "").localeCompare(
                    a.growth?.last_reviewed_on ?? "",
                  )
                : (b.growth?.level ?? -1) - (a.growth?.level ?? -1);
        return (
          primary ||
          (b.resource.updated ?? "").localeCompare(a.resource.updated ?? "") ||
          a.resource.name.localeCompare(b.resource.name, "ja")
        );
      });
  }, [namespace, growth, query, sort]);
  return (
    <section className="space-y-3" aria-label="リソース一覧">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="size-5" />
            リソース一覧{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {query.trim()
                ? `${books.length} / ${shelfResources(namespace).length}冊`
                : `${books.length}冊`}
            </span>
          </h2>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {summary.map(([label, value]) => (
              <div key={label} className="flex gap-1.5">
                <dt>{label}</dt>
                <dd className="font-medium tabular-nums text-foreground">
                  {value.toLocaleString("ja-JP")}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="本棚の並び順"
          className="rounded border bg-background px-2 py-1 text-sm"
        >
          <option value="recent">復習日順</option>
          <option value="xp">復習XP順</option>
          <option value="power">Power順</option>
          <option value="level">Lv順</option>
        </select>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="タイトル・著者で探す"
          aria-label="本棚を絞り込む"
          data-page-input-priority
          className="pl-9"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">
          成長情報を取得できませんでした。
          <Button variant="link" size="sm" onClick={onRetry}>
            再試行
          </Button>
        </p>
      )}
      <table className="block w-full border text-sm" aria-label="リソース一覧">
        <thead className="sticky top-0 z-10 hidden border-b bg-background text-xs text-muted-foreground md:block">
          <tr className={`${rowLayout} px-3 py-2`}>
            {(
              [
                ["Lv", "level"],
                ["Power", "power"],
                ["リソース", "title"],
                ["著者", "author"],
                ["XP", "xp"],
                ["復習日", "recent"],
                ["更新日", "updated"],
              ] as const
            ).map(([label, key]) => (
              <th
                key={key}
                scope="col"
                className="min-w-0 text-left font-medium"
                aria-sort={sort === key ? "descending" : "none"}
              >
                {key === "title" || key === "author" || key === "updated" ? (
                  label
                ) : (
                  <button
                    type="button"
                    onClick={() => setSort(key)}
                    className="hover:text-foreground"
                  >
                    {label}
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block divide-y">
          {books.map(({ resource, growth: item }) => (
            <ResourceBook
              key={resource.uid}
              resource={resource}
              growth={item}
              rules={growth?.rules}
              loading={loading}
              own={own}
            />
          ))}
        </tbody>
      </table>
      {books.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {query ? "一致する本はありません。" : "まだリソースがありません。"}
        </p>
      )}
    </section>
  );
}

function ResourceBook({
  resource,
  growth,
  rules,
  loading,
  own,
}: {
  resource: MResource;
  growth?: Growth;
  rules?: GrowthResult["rules"];
  loading: boolean;
  own: boolean;
}) {
  const percentage = growth
    ? Math.min(
        100,
        growth.xp_for_next_level > 0
          ? (100 * growth.current_level_xp) / growth.xp_for_next_level
          : 100,
      )
    : 0;
  const title = resource.name.replace(/^#+\s*/, "");
  const authors = resource.authors?.join("・") || "—";
  return (
    <Dialog>
      <tr className={`${rowLayout} gap-y-2 px-3 py-2 hover:bg-accent/30`}>
        <td className="col-start-1 row-start-1 font-semibold tabular-nums md:col-auto md:row-auto">
          <DialogTrigger asChild>
            <button
              type="button"
              disabled={!growth}
              aria-label={`${resource.name}のLv内訳を見る`}
              className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
            >
              <span className="md:hidden">Lv. </span>
              {growth ? growth.level : loading ? "…" : "—"}
            </button>
          </DialogTrigger>
        </td>
        <td className="col-start-2 row-start-1 text-xs tabular-nums text-muted-foreground md:col-auto md:row-auto">
          <span className="block md:hidden">Power</span>
          {growth?.power.toLocaleString("ja-JP") ?? "—"}
        </td>
        <td className="col-start-3 row-start-1 min-w-0 md:col-auto md:row-auto">
          <Link
            to={`/resource/${resource.uid}`}
            title={title}
            className="flex min-w-0 items-center gap-2 font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BookOpen className="size-4 shrink-0" />
            <span className="truncate">{title}</span>
          </Link>
          {own && (
            <Link
              to={`/review?resource=${resource.uid}`}
              aria-label={`${title}を復習`}
              className="mt-1 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              復習
            </Link>
          )}
        </td>
        <td
          className="col-start-3 row-start-2 min-w-0 truncate text-xs text-muted-foreground md:col-auto md:row-auto"
          title={authors}
        >
          {authors}
        </td>
        <td className="col-span-3 row-start-3 min-w-0 md:col-span-1 md:row-auto">
          <DialogTrigger asChild>
            <button
              type="button"
              disabled={!growth}
              aria-label={`${resource.name}のXP内訳を見る`}
              className="block w-full rounded-sm text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
            >
              <span className="text-xs tabular-nums text-muted-foreground">
                {growth
                  ? `${growth.current_level_xp} / ${growth.xp_for_next_level} XP`
                  : "—"}
              </span>
              <Progress
                value={percentage}
                className="mt-1 h-1"
                aria-label={`${resource.name}のレベル進捗`}
              />
            </button>
          </DialogTrigger>
        </td>
        <td className="col-span-2 row-start-4 min-w-0 text-xs tabular-nums text-muted-foreground md:col-span-1 md:row-auto">
          <span className="md:hidden">復習日 </span>
          <ResourceDate value={growth?.last_reviewed_on} label="復習日" />
        </td>
        <td className="col-start-3 row-start-4 min-w-0 text-right text-xs tabular-nums text-muted-foreground md:col-auto md:row-auto md:text-left">
          <span className="md:hidden">更新日 </span>
          <ResourceDate value={resource.updated} label="更新日" />
        </td>
      </tr>
      {growth && (
        <DialogContent
          className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle className="pr-6 leading-relaxed">
              {resource.name.replace(/^#+\s*/, "")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-semibold">Lv. {growth.level}</span>
            <span className="text-sm">累計 {growth.total_xp} XP</span>
          </div>
          <Progress value={percentage} aria-label="リソースのレベル進捗" />
          <p className="text-xs text-muted-foreground">
            次のLvまで {growth.xp_for_next_level - growth.current_level_xp} XP
          </p>
          <dl className="grid grid-cols-[1fr_auto] gap-2 rounded border p-3 text-sm">
            <dt>見たよ</dt>
            <dd>+{growth.exposure_xp ?? "—"} XP</dd>
            <dt>クイズ回答</dt>
            <dd>+{growth.answer_xp ?? "—"} XP</dd>
            <dt>正解ボーナス</dt>
            <dd>+{growth.correct_bonus_xp ?? "—"} XP</dd>
          </dl>
          {rules && (
            <p className="text-xs text-muted-foreground">
              見たよ +{rules.exposure_xp} ／ 回答 +{rules.answer_xp} ／ 正解 +
              {rules.correct_bonus_xp} XP。同じ対象・種別は1日1回。
              次のLvまで：現在Lv × {rules.level_xp_coefficient} XP。
            </p>
          )}
          <div className="rounded border p-3 text-sm">
            <p className="font-semibold">Power {growth.power}</p>
            <PowerBreakdown counts={growth} weights={rules?.power_weights} />
          </div>
          {own && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">最近の成長</h4>
              {growth.recent_xp.length ? (
                <ul className="divide-y">
                  {growth.recent_xp.map((event, index) => (
                    <li
                      key={`${event.earned_on}-${event.source}-${index}`}
                      className="py-2 text-xs"
                    >
                      <div className="flex justify-between gap-2 text-muted-foreground">
                        <span>
                          {event.earned_on} ·{" "}
                          {(
                            {
                              tanbun_exposure: "見たよ",
                              quiz_answer: "回答",
                              correct_bonus: "正解",
                            } as Record<string, string>
                          )[event.source] ?? event.source}
                        </span>
                        <span>+{event.xp} XP</span>
                      </div>
                      <p className="mt-1 break-words">{event.subject}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  まだ復習の記録はありません。
                </p>
              )}
            </div>
          )}
          <Button asChild>
            <Link to={`/resource/${resource.uid}`}>読書メモを開く</Link>
          </Button>
        </DialogContent>
      )}
    </Dialog>
  );
}

function ResourceDate({
  value,
  label,
}: { value?: string | null; label: string }) {
  if (!value) return <>—</>;
  return (
    <time dateTime={value} title={`${label}: ${value}`}>
      {formatRelativeDate(value)}
    </time>
  );
}
