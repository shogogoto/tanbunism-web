import { BookOpen, KeyRound, LibraryBig } from "lucide-react";
import { useRef, useState } from "react";
import useSWR from "swr";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { gameRequest } from "./battle";

export type PublicDungeon = {
  resource_id: string;
  name: string;
  owner_id: string;
  owner_name: string;
  joined: boolean;
  key_owned?: boolean;
};

export default function TravelersLibrary({
  userId,
  disabled,
  onClaim,
  onInventory,
}: {
  userId: string;
  disabled: boolean;
  onClaim: (resourceId: string) => Promise<void>;
  onInventory: () => void;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [joining, setJoining] = useState<string>();
  const [joinError, setJoinError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const pending = useRef(false);
  const { data, error, isLoading, mutate } = useSWR(
    ["public-dungeons", userId, query, offset],
    () =>
      gameRequest<PublicDungeon[]>(
        `dungeons/public?q=${encodeURIComponent(query)}&offset=${offset}`,
      ),
  );

  async function claim(dungeon: PublicDungeon) {
    if (disabled || pending.current) return;
    pending.current = true;
    const id = dungeon.resource_id;
    setJoining(id);
    setJoinError(undefined);
    setMessage(undefined);
    try {
      await onClaim(id);
      setMessage(`「${dungeon.name}」の開放キーを入手しました。`);
      await mutate();
    } catch (cause) {
      setJoinError(
        cause instanceof Error
          ? cause.message
          : "開放キーを入手できませんでした。",
      );
    } finally {
      setJoining(undefined);
      pending.current = false;
    }
  }

  return (
    <section className="space-y-4" aria-label="旅人の書庫">
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <LibraryBig className="size-5 text-amber-500" />
          旅人の書庫
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          旅人たちの知識へ続く鍵。開放キーを手に入れて、アイテムから使えます。
        </p>
      </div>
      {message && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 p-3">
          <output className="flex items-center gap-2 text-sm">
            <KeyRound className="size-4 shrink-0 text-amber-500" />
            {message}
          </output>
          <Button variant="outline" onClick={onInventory}>
            所持品へ
          </Button>
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(input);
          setOffset(0);
        }}
      >
        <Input
          aria-label="書庫を検索"
          placeholder="リソース名・ユーザー名"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={200}
        />
        <Button type="submit" variant="outline">
          検索
        </Button>
      </form>
      {(error || joinError) && (
        <p role="alert" className="text-sm text-destructive">
          {joinError ?? error.message}
          <Button variant="link" onClick={() => void mutate()}>
            再試行
          </Button>
        </p>
      )}
      {isLoading && <output>読み込み中…</output>}
      {data?.length === 0 && (
        <p className="text-sm">該当するダンジョンがありません。</p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {data?.map((dungeon) => (
          <div
            key={dungeon.resource_id}
            className="flex min-w-0 items-center gap-3 rounded-xl border bg-muted/10 p-3"
          >
            <BookOpen className="size-8 shrink-0 text-amber-600/80" />
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium">{dungeon.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {dungeon.owner_name}の書架
              </p>
            </div>
            <Button
              variant="outline"
              disabled={
                disabled ||
                Boolean(joining) ||
                dungeon.joined ||
                dungeon.key_owned
              }
              onClick={() => void claim(dungeon)}
            >
              {joining === dungeon.resource_id
                ? "受け取り中…"
                : dungeon.joined
                  ? "開放済み"
                  : dungeon.key_owned
                    ? "キー所持"
                    : "キーを入手"}
            </Button>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <Button
          variant="ghost"
          disabled={offset === 0 || isLoading}
          onClick={() => setOffset(Math.max(0, offset - 30))}
        >
          前へ
        </Button>
        <Button
          variant="ghost"
          disabled={!data || data.length < 30 || isLoading}
          onClick={() => setOffset(offset + 30)}
        >
          次へ
        </Button>
      </div>
    </section>
  );
}
