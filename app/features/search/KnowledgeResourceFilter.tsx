import { useEffect, useState } from "react";
import { Input } from "~/shared/components/ui/input";
import { Label } from "~/shared/components/ui/label";
import { searchResourcePostResourceSearchPost } from "~/shared/generated/entry/entry";
import type {
  ResourceInfo,
  ResourceSearchResult,
} from "~/shared/generated/fastAPI.schemas";
import { useDebounce } from "~/shared/hooks/useDebounce";

export default function KnowledgeResourceFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const search = useDebounce(query, 250);
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    void searchResourcePostResourceSearchPost(
      {
        q: search,
        paging: { page: 1, size: 20 },
        order_by: ["title"],
        desc: false,
      },
      { signal: controller.signal },
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        if (response.status !== 200) throw new Error("failed");
        setResources((response.data as ResourceSearchResult).data ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search]);
  return (
    <div className="space-y-2">
      <Label htmlFor="knowledge-resource-query">対象リソース</Label>
      <Input
        id="knowledge-resource-query"
        placeholder="リソース名で探す"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <select
        aria-label="知識の対象リソース"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
      >
        <option value="">すべてのリソース</option>
        {value && !resources.some((item) => item.resource.uid === value) && (
          <option value={value}>選択中のリソース</option>
        )}
        {resources.map(({ resource, user }) => (
          <option key={resource.uid} value={resource.uid}>
            {resource.name}（@{user.username ?? user.uid}）
          </option>
        ))}
      </select>
      {loading && (
        <p className="text-xs text-muted-foreground">リソースを検索中…</p>
      )}
      {error && (
        <p className="text-xs text-destructive">
          リソースを取得できませんでした。検索文字を変更して再試行してください。
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        PageRankは各リソース内の平均を1とした値で並べます。
      </p>
    </div>
  );
}
