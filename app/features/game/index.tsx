import { BookOpen, Compass, Heart, Shield, Swords } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import useSWR, { useSWRConfig } from "swr";
import AuthGuard from "~/features/auth/AuthGuard";
import { useAuth } from "~/features/auth/AuthProvider";
import { useResourceGrowth } from "~/features/gamification/ResourceGrowth";
import { invalidateGamification } from "~/features/gamification/invalidate";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import QuizPrompt from "~/features/quiz/QuizPrompt";
import { quizOptionLabel } from "~/features/quiz/relationPresentation";
import { markTanbunSeen } from "~/features/review/api";
import { useTanbunPreview } from "~/features/tanbun/detail/Preview";
import Loading from "~/shared/components/Loading";
import { Button } from "~/shared/components/ui/button";
import { Input } from "~/shared/components/ui/input";
import { useGetLearningProgressUserUserIdLearningProgressGet } from "~/shared/generated/gamification/gamification";
import { consumeAdventureAccess, useAdventureAccess } from "./access";
import { loadDungeon } from "./api";
import {
  ENEMIES_TO_CLEAR,
  type GameSave,
  MOVES_PER_EVENT,
  answer,
  enterDungeon,
  move,
  newSave,
  resumeEvent,
} from "./domain";
import { readGameSave, writeGameSave } from "./storage";

export default function Game() {
  const { user } = useAuth();
  return (
    <AuthGuard>
      {user && <GamePlay key={user.uid} userId={user.uid} />}
    </AuthGuard>
  );
}

export function GamePlay({ userId }: { userId: string }) {
  const [save, setSave] = useState<GameSave>(newSave);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingMove = useRef(false);
  const [error, setError] = useState<string>();
  const [feedback, setFeedback] = useState<string>();
  const access = useAdventureAccess(userId);
  const { data: growth, error: growthError } = useResourceGrowth();
  const progress = useGetLearningProgressUserUserIdLearningProgressGet(userId, {
    fetch: { credentials: "include" },
  });
  const level =
    progress.data?.status === 200 ? progress.data.data.level : undefined;
  const { mutate } = useSWRConfig();
  const { openPreview, preview } = useTanbunPreview();
  const run = save.run;
  const resourceId = run?.resourceId ?? selectedId;
  const {
    data: content,
    error: contentError,
    isLoading,
    mutate: retryContent,
  } = useSWR(
    resourceId ? ["game-dungeon", userId, resourceId] : null,
    () => loadDungeon(resourceId),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );
  useEffect(() => {
    setSave(readGameSave(userId));
    setReady(true);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [userId]);

  function update(next: GameSave) {
    try {
      writeGameSave(userId, next);
      setSave(next);
    } catch {
      setSave(next);
      setError(
        "冒険状態をこの端末に保存できませんでした。画面を閉じると進行が失われます。",
      );
    }
  }
  async function advance(sentenceId: string) {
    if (pendingMove.current) return;
    pendingMove.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await markTanbunSeen(sentenceId);
      update(move(save, sentenceId, Math.random()));
      void invalidateGamification(mutate, { preserveData: true }).catch(
        () => undefined,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "見たよを記録できませんでした。",
      );
    } finally {
      pendingMove.current = false;
      setBusy(false);
    }
  }
  function leave() {
    if (
      run &&
      run.phase !== "cleared" &&
      run.phase !== "defeated" &&
      !window.confirm(
        "ダンジョンから戻りますか？ 今回の攻略は振り出しに戻ります。復習履歴・XPは残ります。",
      )
    )
      return;
    update({ ...save, run: undefined });
    setFeedback(undefined);
    setSelectedId("");
  }
  async function startEvent() {
    if (pendingMove.current || !access.data?.available || access.error) return;
    if (
      run
        ? run.phase !== "rest"
        : !selected ||
          !level ||
          !content?.quizzes.length ||
          !content?.knowledge.length
    )
      return;
    pendingMove.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const consumed = await consumeAdventureAccess();
      await access.mutate(consumed, { revalidate: false });
      update(
        run
          ? resumeEvent(save)
          : enterDungeon(
              save,
              selectedId,
              selected?.resource_name ?? "リソース",
              level ?? 1,
            ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "冒険を開始できませんでした。",
      );
      void access.mutate().catch(() => undefined);
    } finally {
      pendingMove.current = false;
      setBusy(false);
    }
  }
  if (!ready) return <Loading />;
  const remainingMinutes = Math.max(
    0,
    Math.ceil(
      ((access.data?.next_available_at ?? 0) -
        ((access.data?.server_now ?? 0) +
          now -
          (access.data?.receivedAt ?? now))) /
        60_000,
    ),
  );
  const canStart = Boolean(access.data?.available && !access.error && !busy);
  const paths =
    content?.knowledge
      .filter((item) => !run?.readIds.includes(item.uid))
      .slice(0, 3) ?? [];
  const quiz = content?.quizzes.length
    ? content.quizzes[
        Math.max(0, (run?.quizCursor ?? 0) - (feedback ? 1 : 0)) %
          content.quizzes.length
      ]
    : undefined;
  const resources = [...(growth?.resources ?? [])].sort((a, b) =>
    (a.last_reviewed_on ?? "").localeCompare(b.last_reviewed_on ?? ""),
  );
  const selected = resources.find(
    (resource) => resource.resource_id === selectedId,
  );

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 p-3 pb-8 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Compass />
          冒険
        </h1>
        <span className="text-sm text-muted-foreground">
          {access.data?.available
            ? "冒険可能"
            : access.data && remainingMinutes
              ? `次の冒険まで ${remainingMinutes}分`
              : "冒険権を確認中"}
        </span>
      </header>
      <p className="text-xs text-muted-foreground">
        試作版 · 攻略状態はこの端末に保存。冒険権は毎時00分・30分に回復します。
      </p>
      {(error || access.error || growthError || progress.error) && (
        <p role="alert" className="text-sm text-destructive">
          {error ??
            access.error?.message ??
            growthError?.message ??
            "プレイヤーのLvを取得できませんでした。"}
        </p>
      )}
      {contentError && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{contentError.message}</p>
          <Button variant="outline" onClick={() => void retryContent()}>
            再試行
          </Button>
        </div>
      )}
      {!run ? (
        <>
          <p className="text-sm text-muted-foreground">
            知識を読んで進み、クイズの敵と戦う。敵{ENEMIES_TO_CLEAR}
            体でダンジョン攻略。
          </p>
          <Input
            aria-label="ダンジョンを絞り込む"
            data-global-search-input
            placeholder="リソース名で探す"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {!growth && !growthError && <Loading />}
          {growth && !resources.length && (
            <p>
              リソースがありません。
              <Link className="underline" to="/import">
                読書メモをインポート
              </Link>
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {resources
              .filter((resource) =>
                (resource.resource_name ?? "")
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((resource) => (
                <button
                  key={resource.resource_id}
                  type="button"
                  disabled={busy}
                  data-hotkey-item
                  aria-pressed={selectedId === resource.resource_id}
                  onClick={() => setSelectedId(resource.resource_id)}
                  className={`rounded-lg border p-3 text-left outline-none data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-primary ${selectedId === resource.resource_id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <BookOpen className="size-4 shrink-0" />
                    {resource.resource_name || "リソース"}
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    Lv.{resource.level} · Power {resource.power} · 攻略{" "}
                    {save.clears[resource.resource_id] ?? 0}周
                  </span>
                </button>
              ))}
          </div>
          {selected && (
            <div className="rounded-lg border p-4 space-y-3">
              <h2 className="font-semibold">{selected.resource_name}</h2>
              {isLoading ? (
                <Loading />
              ) : (
                content && (
                  <>
                    <p className="text-sm">
                      知識 {content.knowledge.length}件 · 準備済みクイズ{" "}
                      {content.quizzes.length}問
                    </p>
                    {(!content.knowledge.length || !content.quizzes.length) && (
                      <p className="text-sm text-muted-foreground">
                        冒険には知識と準備済みクイズが必要です。
                        <Link
                          className="underline"
                          to={`/review?resource=${encodeURIComponent(selectedId)}&view=quiz`}
                        >
                          復習でクイズを準備
                        </Link>
                      </p>
                    )}
                    <Button
                      disabled={
                        !canStart ||
                        !level ||
                        !content.knowledge.length ||
                        !content.quizzes.length
                      }
                      onClick={() => void startEvent()}
                    >
                      ダンジョンに入る
                    </Button>
                  </>
                )
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <h2 className="font-semibold">{run.name}</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm tabular-nums">
              <span className="flex gap-1 items-center">
                <Heart className="size-4 text-rose-400" />
                HP {run.hp}/{run.maxHp}
              </span>
              <span className="flex gap-1 items-center">
                <Swords className="size-4" />攻 {run.attack}
              </span>
              <span className="flex gap-1 items-center">
                <Shield className="size-4" />守 {run.defense}
              </span>
            </div>
            <progress
              aria-label="プレイヤーHP"
              className="w-full h-2 accent-rose-400"
              value={run.hp}
              max={run.maxHp}
            />
            <p className="text-xs text-muted-foreground">
              進行 {run.moves}/{MOVES_PER_EVENT} · 撃破 {run.kills}/
              {ENEMIES_TO_CLEAR}
            </p>
          </div>
          {isLoading && <Loading />}
          {feedback ? (
            <div className="rounded-lg border p-4 space-y-3">
              <output className="block">{feedback}</output>
              {quiz && (
                <>
                  <QuizPrompt quiz={quiz} />
                  <p className="text-sm text-emerald-500">
                    正解:{" "}
                    {quiz.correct
                      .map((id) => quizOptionLabel(quiz, quiz.options[id]))
                      .join("・")}
                  </p>
                </>
              )}
              <Button onClick={() => setFeedback(undefined)}>続ける</Button>
            </div>
          ) : run.phase === "path" && content ? (
            <>
              <h3 className="text-sm font-medium">知識を読んで進路を選ぶ</h3>
              {paths.map((item) => (
                <div key={item.uid} className="rounded-lg border p-3 space-y-3">
                  <p className="text-base leading-relaxed">{item.sentence}</p>
                  <div className="flex gap-2">
                    <Button
                      disabled={busy}
                      onClick={() => void advance(item.uid)}
                    >
                      見たよ · この道へ
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => openPreview({ sentenceId: item.uid })}
                    >
                      詳細
                    </Button>
                  </div>
                </div>
              ))}
              {!paths.length && (
                <p>
                  このダンジョンの知識を一巡しました。今回はここまで。復習履歴とXPは残ります。
                </p>
              )}
            </>
          ) : run.phase === "battle" && quiz ? (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 font-semibold">
                <Swords className="size-4" />
                敵と遭遇 · HP {run.enemyHp}/{run.enemyMaxHp}
              </h3>
              <p className="text-xs text-muted-foreground">
                正解で攻撃。不正解でダメージ。
              </p>
              <QuizAttempt
                key={`${run.resourceId}:${run.quizCursor}`}
                quiz={quiz}
                compactMobile
                onAnswered={(correct) => {
                  const next = answer(save, correct);
                  update(next);
                  setFeedback(
                    correct
                      ? next.run?.enemyHp === 0
                        ? "敵を倒した！"
                        : `${run.attack}ダメージ！`
                      : `不正解 · HP −${run.hp - (next.run?.hp ?? 0)}`,
                  );
                }}
              />
            </div>
          ) : run.phase === "rest" ? (
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold">今回の冒険はここまで</h3>
              <p className="text-sm text-muted-foreground">
                HP・撃破数を引き継いで次の冒険へ。ダンジョン内では回復しません。
              </p>
              <Button disabled={!canStart} onClick={() => void startEvent()}>
                {!access.data?.available && remainingMinutes
                  ? `あと${remainingMinutes}分`
                  : "冒険を再開"}
              </Button>
            </div>
          ) : run.phase === "cleared" ? (
            <div
              aria-live="polite"
              className="rounded-lg border border-emerald-500/50 bg-emerald-500/5 p-4"
            >
              <h3 className="font-semibold">ダンジョン攻略！</h3>
              <p className="mt-2 text-sm">
                攻略 {save.clears[run.resourceId]}周 · 復習の成果を持ち帰ろう。
              </p>
            </div>
          ) : run.phase === "defeated" ? (
            <div aria-live="polite" className="rounded-lg border p-4">
              <h3 className="font-semibold">冒険失敗</h3>
              <p className="mt-2 text-sm">
                攻略は振り出しへ。復習履歴とXPは失われません。
              </p>
            </div>
          ) : null}
          <Button variant="outline" disabled={busy} onClick={leave}>
            {run.phase === "cleared" || run.phase === "defeated"
              ? "入口へ戻る"
              : "ダンジョンから戻る"}
          </Button>
        </>
      )}
      {preview}
    </section>
  );
}
