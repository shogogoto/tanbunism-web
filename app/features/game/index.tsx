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
import DungeonRoute from "./Route";
import { useAdventureAccess } from "./access";
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
import { requestGameState } from "./state";
import { readGameSave } from "./storage";

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
  const [stateLoaded, setStateLoaded] = useState(false);
  const revision = useRef(0);
  const [menu, setMenu] = useState<"home" | "adventure" | "status" | "items">(
    "home",
  );
  const [showDestinations, setShowDestinations] = useState(false);
  const [legacy, setLegacy] = useState<GameSave>();
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
    data: loadedContent,
    error: contentError,
    isLoading,
    mutate: retryContent,
  } = useSWR(
    resourceId && !save.content ? ["game-dungeon", userId, resourceId] : null,
    () => loadDungeon(resourceId),
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );
  const content = run ? (save.content ?? loadedContent) : loadedContent;
  useEffect(() => {
    let active = true;
    const reload = () => {
      if (pendingMove.current) return;
      void requestGameState()
        .then((state) => {
          if (!active) return;
          revision.current = state.revision;
          setSave(state.save);
          setStateLoaded(true);
          if (!state.revision) {
            const old = readGameSave(userId);
            if (old.run || Object.keys(old.clears).length) setLegacy(old);
          } else setLegacy(undefined);
          setReady(true);
        })
        .catch((cause) => {
          if (active) {
            setError(cause.message);
            setReady(true);
          }
        });
    };
    reload();
    window.addEventListener("focus", reload);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", reload);
    };
  }, [userId]);

  async function update(next: GameSave, consumeAccess = false) {
    try {
      const state = await requestGameState({
        revision: revision.current,
        save: next.run ? { ...next, content: next.content ?? content } : next,
        consume_access: consumeAccess,
      });
      revision.current = state.revision;
      setSave(state.save);
    } catch (cause) {
      const latest = await requestGameState();
      revision.current = latest.revision;
      setSave(latest.save);
      throw cause;
    }
  }
  async function advance(sentenceId: string) {
    if (pendingMove.current) return;
    pendingMove.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await markTanbunSeen(sentenceId);
      await update(move(save, sentenceId, Math.random()));
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
  async function leave() {
    if (
      run &&
      run.phase !== "cleared" &&
      run.phase !== "defeated" &&
      !window.confirm(
        "ダンジョンから戻りますか？ 今回の攻略は振り出しに戻ります。復習履歴・XPは残ります。",
      )
    )
      return;
    setBusy(true);
    try {
      await update({ ...save, run: undefined, content: undefined });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "撤退を保存できませんでした。",
      );
      return;
    } finally {
      setBusy(false);
    }
    setFeedback(undefined);
    setSelectedId("");
    setMenu("home");
  }
  async function startEvent() {
    if (
      !stateLoaded ||
      pendingMove.current ||
      !access.data?.available ||
      access.error
    )
      return;
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
      await update(
        run
          ? resumeEvent(save)
          : {
              ...enterDungeon(
                save,
                selectedId,
                selected?.resource_name ?? "リソース",
                level ?? 1,
              ),
              content,
            },
        true,
      );
      void access.mutate().catch(() => undefined);
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
  const canStart = Boolean(
    stateLoaded && access.data?.available && !access.error && !busy,
  );
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
  const recommended = selected ?? resources[0];

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4 p-3 pb-8 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Compass />
          ゲーム
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
        冒険権は毎時00分・30分に回復します。
      </p>
      {menu !== "home" && (
        <Button variant="ghost" onClick={() => setMenu("home")}>
          ゲームメニュー
        </Button>
      )}
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
      {menu === "home" ? (
        <div className="space-y-3">
          {legacy && (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => {
                setBusy(true);
                void update(legacy)
                  .then(() => setLegacy(undefined))
                  .catch((cause) => setError(cause.message))
                  .finally(() => setBusy(false));
              }}
            >
              この端末の旧冒険を引き継ぐ
            </Button>
          )}
          {run && (
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">攻略中</p>
              <h2 className="font-semibold">{run.name}</h2>
              <p className="text-sm">
                HP {run.hp}/{run.maxHp} · 撃破 {run.kills}/{ENEMIES_TO_CLEAR}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                現在地 ·{" "}
                {run.readIds.length ? `第${run.readIds.length}地点` : "入口"}
              </p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              variant="outline"
              onClick={() => {
                setMenu("adventure");
                if (!run && !selectedId && recommended)
                  setSelectedId(recommended.resource_id);
              }}
            >
              {run ? "冒険を続ける" : "冒険"}
            </Button>
            <Button variant="outline" onClick={() => setMenu("status")}>
              ステータス
            </Button>
            <Button variant="outline" onClick={() => setMenu("items")}>
              アイテム
            </Button>
          </div>
        </div>
      ) : menu === "status" ? (
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">ステータス</h2>
          <p>Lv. {level ?? "—"}</p>
          <p>
            HP{" "}
            {run
              ? `${run.hp}/${run.maxHp}`
              : level
                ? `${30 + level * 5}/${30 + level * 5}`
                : "—"}{" "}
            · 攻 {run?.attack ?? (level ? 8 + level * 2 : "—")} · 守{" "}
            {run?.defense ?? level ?? "—"}
          </p>
          <p>
            ダンジョン攻略{" "}
            {Object.values(save.clears).reduce((sum, value) => sum + value, 0)}
            周
          </p>
        </div>
      ) : menu === "items" ? (
        <div className="rounded-lg border p-4 space-y-2">
          <h2 className="font-semibold">アイテム</h2>
          <p className="text-sm text-muted-foreground">
            まだアイテムはありません。武器・アイテム機能は今後追加予定です。
          </p>
        </div>
      ) : !run ? (
        <>
          <p className="text-sm text-muted-foreground">
            知識を読んで進み、クイズの敵と戦う。敵{ENEMIES_TO_CLEAR}
            体でダンジョン攻略。
          </p>
          <Button
            variant="outline"
            onClick={() => setShowDestinations(!showDestinations)}
          >
            行き先を変更する
          </Button>
          {showDestinations && (
            <>
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
            </>
          )}
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
              今回の移動 {run.moves}/{MOVES_PER_EVENT} · 撃破 {run.kills}/
              {ENEMIES_TO_CLEAR}
            </p>
          </div>
          <DungeonRoute
            key={run.resourceId}
            run={run}
            knowledge={content?.knowledge ?? []}
            onOpen={(sentenceId) => openPreview({ sentenceId })}
          />
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
              <h3 className="text-sm font-medium">
                第{run.readIds.length + 1}地点へ · 次の進路
              </h3>
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
                  void (async () => {
                    const next = answer(save, correct);
                    setBusy(true);
                    try {
                      await update(next);
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "戦闘を保存できませんでした。",
                      );
                      return;
                    } finally {
                      setBusy(false);
                    }
                    setFeedback(
                      correct
                        ? next.run?.enemyHp === 0
                          ? "敵を倒した！"
                          : `${run.attack}ダメージ！`
                        : `不正解 · HP −${run.hp - (next.run?.hp ?? 0)}`,
                    );
                  })();
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
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void leave()}
          >
            {run.phase === "cleared" || run.phase === "defeated"
              ? "入口へ戻る"
              : "撤退"}
          </Button>
        </>
      )}
      {preview}
    </section>
  );
}
