import { useState } from "react";
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
};

export default function PublicDungeons({
  userId,
  disabled,
  onJoin,
}: {
  userId: string;
  disabled: boolean;
  onJoin: (resourceId: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [joining, setJoining] = useState<string>();
  const [joinError, setJoinError] = useState<string>();
  const { data, error, isLoading, mutate } = useSWR(
    open ? ["public-dungeons", userId, query, offset] : null,
    () =>
      gameRequest<PublicDungeon[]>(
        `dungeons/public?q=${encodeURIComponent(query)}&offset=${offset}`,
      ),
  );

  async function join(id: string) {
    setJoining(id);
    setJoinError(undefined);
    try {
      await onJoin(id);
      await mutate();
    } catch (cause) {
      setJoinError(
        cause instanceof Error ? cause.message : "追加できませんでした。",
      );
    } finally {
      setJoining(undefined);
    }
  }

  return (
    <section className="space-y-3" aria-label="他ユーザーのダンジョン">
      <Button
        variant="outline"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        他ユーザーのダンジョン
      </Button>
      {open && (
        <>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery(input);
              setOffset(0);
            }}
          >
            <Input
              aria-label="公開ダンジョンを検索"
              placeholder="リソース名・ユーザー名"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={200}
            />
            <Button type="submit" variant="outline">
              検索
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            行き先に追加すると、自分の進行状況で遊べます。
          </p>
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
                className="flex min-w-0 items-center gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{dungeon.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {dungeon.owner_name}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={disabled || Boolean(joining) || dungeon.joined}
                  onClick={() => void join(dungeon.resource_id)}
                >
                  {joining === dungeon.resource_id
                    ? "追加中…"
                    : dungeon.joined
                      ? "追加済み"
                      : "追加"}
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
        </>
      )}
    </section>
  );
}
