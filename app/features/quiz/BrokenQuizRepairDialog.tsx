import { Search, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/shared/components/ui/dialog";
import { Input } from "~/shared/components/ui/input";
import {
  type BrokenQuizReference,
  type ResourceSentenceCandidate,
  listResourceSentenceCandidates,
  repairBrokenQuizReference,
} from "./api";

type Props = {
  reference: BrokenQuizReference;
  resourceName?: string;
  onRepaired: () => void | Promise<void>;
};

export default function BrokenQuizRepairDialog({
  reference,
  resourceName,
  onRepaired,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<ResourceSentenceCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState<string>();

  const visibleCandidates = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return candidates;
    return candidates.filter((candidate) =>
      candidate.sentence.toLocaleLowerCase().includes(normalized),
    );
  }, [candidates, query]);

  async function handleOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen || candidates.length > 0) return;
    setLoading(true);
    setError(undefined);
    try {
      setCandidates(
        await listResourceSentenceCandidates(reference.resource_id),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "現行単文を取得できませんでした。",
      );
    } finally {
      setLoading(false);
    }
  }

  async function repair() {
    if (!selectedId) return;
    setRepairing(true);
    setError(undefined);
    try {
      await repairBrokenQuizReference(
        reference.quiz_id,
        reference.retired_sentence_id,
        selectedId,
      );
      toast.success("クイズの参照を現行単文へ付け替えました");
      setOpen(false);
      await onRepaired();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "クイズの参照を修復できませんでした。",
      );
    } finally {
      setRepairing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => void handleOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Wrench /> 修復
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] grid-rows-[auto_auto_minmax(0,1fr)_auto] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>参照先の単文を選ぶ</DialogTitle>
          <DialogDescription>
            {resourceName ?? "元Resource"}
            にある現行単文へ付け替えます。内容が同じ、または後継にあたる単文を選んでください。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
          <span className="text-xs text-muted-foreground">退役した単文</span>
          <p>{reference.retired_value}</p>
        </div>
        <div className="min-h-0 space-y-2 overflow-hidden">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              placeholder="Resource内の単文を絞り込む"
              aria-label="修復先の単文を検索"
            />
          </div>
          <div className="max-h-[45vh] space-y-1 overflow-y-auto rounded-md border p-1">
            {loading && (
              <p className="p-3 text-sm text-muted-foreground">単文を取得中…</p>
            )}
            {!loading && visibleCandidates.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">
                条件に一致する現行単文がありません。
              </p>
            )}
            {visibleCandidates.map((candidate) => (
              <label
                key={candidate.uid}
                className="flex cursor-pointer items-start gap-3 rounded-md p-2 text-sm hover:bg-muted"
              >
                <input
                  type="radio"
                  name={`replacement-${reference.retired_sentence_id}`}
                  className="mt-1"
                  checked={selectedId === candidate.uid}
                  onChange={() => setSelectedId(candidate.uid)}
                />
                <span>{candidate.sentence}</span>
              </label>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => void repair()}
            disabled={!selectedId || repairing}
          >
            {repairing ? "修復中…" : "この単文へ付け替える"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
