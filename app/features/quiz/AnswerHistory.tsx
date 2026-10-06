import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import Loading from "~/shared/components/Loading";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";
import { ChainSentenceLink, RelationAnnotation } from "./QuizKnowledge";
import QuizPrompt, { QuizTypeBadge } from "./QuizPrompt";
import QuizReportButton from "./QuizReportButton";
import {
  type AnswerHistoryItem,
  type QuizChain,
  type QuizType,
  type StudyResource,
  getQuizChain,
  listStudyResources,
} from "./api";
import { quizOptionLabel } from "./relationPresentation";
import {
  type AnswerFilters,
  useAnswerHistoryFeed,
} from "./useAnswerHistoryFeed";

const quizTypeLabels: Record<QuizType, string> = {
  term2sent: "用語 → 単文",
  sent2term: "単文 → 用語",
  rel2pair: "関係 → 単文組",
  pair2rel: "単文組 → 関係",
};

const answerRowGrid =
  "grid grid-cols-[4rem_4.5rem_minmax(0,1fr)_5rem] md:grid-cols-[4.5rem_7rem_minmax(0,3fr)_minmax(0,1fr)_7rem_4rem]";

function formatAnswerDate(value: string): string {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("ja-JP", {
    ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
    month: "numeric",
    day: "numeric",
  }).format(date);
}

export default function AnswerHistory() {
  const {
    feed,
    setFeed,
    loading,
    error,
    rootRef,
    sentinelRef,
    loadMore,
    updateFilters,
    save,
    loadNextForKeyboard,
  } = useAnswerHistoryFeed();
  const {
    items,
    filters: { correct, quizType, resourceId },
  } = feed;
  const isLoading = loading || (!feed.loaded && !error);
  const [resources, setResources] = useState<StudyResource[]>([]);
  useEffect(() => {
    let active = true;
    listStudyResources()
      .then((result) => {
        if (active) setResources(result);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const resourceNames = useMemo(
    () =>
      new Map(
        resources.map((resource) => [
          resource.uid.replaceAll("-", ""),
          resource.name,
        ]),
      ),
    [resources],
  );

  return (
    <div
      ref={rootRef}
      onClickCapture={save}
      className="mx-auto w-full max-w-6xl space-y-2 p-2 sm:p-3"
    >
      <Card className="sticky top-0 z-30 h-24 gap-0 bg-background py-0 shadow-sm md:h-13">
        <CardContent className="grid h-full grid-cols-2 items-center gap-2 p-2 md:flex">
          <label className="flex min-w-0 items-center gap-1.5 text-xs">
            <span>正誤</span>
            <select
              value={correct}
              onChange={(event) =>
                updateFilters({
                  correct: event.target.value as AnswerFilters["correct"],
                })
              }
              className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">すべて</option>
              <option value="false">不正解</option>
              <option value="true">正解</option>
            </select>
          </label>
          <label className="flex min-w-0 items-center gap-1.5 text-xs">
            <span>形式</span>
            <select
              value={quizType}
              onChange={(event) =>
                updateFilters({ quizType: event.target.value as QuizType | "" })
              }
              className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">すべて</option>
              {Object.entries(quizTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex min-w-0 flex-1 items-center gap-1.5 text-xs">
            <span className="shrink-0">Resource</span>
            <select
              value={resourceId}
              onChange={(event) =>
                updateFilters({ resourceId: event.target.value })
              }
              className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">すべて</option>
              {resources.map((resource) => (
                <option key={resource.uid} value={resource.uid}>
                  {resource.name}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {isLoading && items.length === 0 && <Loading />}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!isLoading && !error && items.length === 0 && (
        <p className="border p-2 text-sm text-muted-foreground">
          条件に一致する回答はありません。
        </p>
      )}

      <table aria-label="回答履歴" className="block w-full border text-left">
        <thead className="sticky top-24 z-20 block border-b bg-background shadow-sm md:top-13">
          <tr
            className={`${answerRowGrid} items-center text-xs font-medium text-muted-foreground`}
          >
            <th scope="col" className="px-2 py-2">
              結果
            </th>
            <th scope="col" className="px-2 py-2">
              種別
            </th>
            <th scope="col" className="px-2 py-2">
              問題
            </th>
            <th scope="col" className="hidden px-2 py-2 md:block">
              Resource
            </th>
            <th scope="col" className="px-2 py-2">
              回答日時
            </th>
            <th scope="col" className="hidden px-2 py-2 md:block">
              詳細
            </th>
          </tr>
        </thead>
        <tbody className="block divide-y">
          {items.map((item) => (
            <AnswerRow
              key={item.answer.answer_uid}
              item={item}
              isCurrent={feed.currentId === item.answer.answer_uid}
              onCurrent={() =>
                setFeed((current) => ({
                  ...current,
                  currentId: item.answer.answer_uid,
                }))
              }
              isExpanded={feed.expanded[item.answer.answer_uid] ?? false}
              onExpanded={(expanded) =>
                setFeed((current) => ({
                  ...current,
                  expanded: {
                    ...current.expanded,
                    [item.answer.answer_uid]: expanded,
                  },
                }))
              }
              chain={feed.chains[item.quiz.quiz_id]}
              onChain={(chain) =>
                setFeed((current) => ({
                  ...current,
                  chains: { ...current.chains, [item.quiz.quiz_id]: chain },
                }))
              }
              isFirst={item.answer.answer_uid === items[0]?.answer.answer_uid}
              isLast={
                item.answer.answer_uid === items.at(-1)?.answer.answer_uid
              }
              onLoadNext={loadNextForKeyboard}
              resourceName={resourceNames.get(
                item.resource_id.replaceAll("-", ""),
              )}
            />
          ))}
        </tbody>
      </table>

      <div
        ref={sentinelRef}
        className="flex min-h-10 items-center justify-center py-2"
      >
        {loading && items.length > 0 ? (
          <Loading />
        ) : feed.hasMore && (!error || items.length > 0) ? (
          <Button variant="ghost" onClick={() => void loadMore()}>
            続きを読み込む
          </Button>
        ) : error ? (
          <Button variant="outline" onClick={() => void loadMore()}>
            再試行
          </Button>
        ) : items.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            すべての回答を表示しました
          </span>
        ) : null}
      </div>
    </div>
  );
}

function AnswerRow({
  item,
  resourceName,
  isCurrent,
  onCurrent,
  isExpanded,
  onExpanded,
  chain,
  onChain,
  isFirst,
  isLast,
  onLoadNext,
}: {
  item: AnswerHistoryItem;
  resourceName?: string;
  isCurrent: boolean;
  onCurrent: () => void;
  isExpanded: boolean;
  onExpanded: (expanded: boolean) => void;
  chain?: QuizChain;
  onChain: (chain: QuizChain) => void;
  isFirst: boolean;
  isLast: boolean;
  onLoadNext: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const onChainRef = useRef(onChain);
  onChainRef.current = onChain;
  const { answer, quiz } = item;
  const problemSentenceIds = new Set(
    chain?.links
      .filter(
        (link) =>
          link.quiz_id === quiz.quiz_id &&
          (link.role === "target" ||
            (item.quiz_type === "pair2rel" && link.role === "correct")),
      )
      .map((link) => link.sentence_id),
  );
  const problemSentences = chain?.sentences.filter((sentence) =>
    problemSentenceIds.has(sentence.uid),
  );

  useEffect(() => {
    if (!isExpanded || chain) return;
    let active = true;
    setIsLoading(true);
    setError(undefined);
    getQuizChain(quiz.quiz_id)
      .then((result) => {
        if (active) onChainRef.current(result);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "クイズ詳細を取得できませんでした。",
          );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isExpanded, chain, quiz.quiz_id]);

  function toggleDetails() {
    onExpanded(!isExpanded);
  }

  return (
    <tr
      data-hotkey-item
      data-answer-id={answer.answer_uid}
      data-hotkey-active={isCurrent || undefined}
      tabIndex={-1}
      className={`${answerRowGrid} scroll-mt-44 items-center outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[hotkey-active=true]:bg-accent/70 data-[hotkey-active=true]:ring-2 data-[hotkey-active=true]:ring-inset data-[hotkey-active=true]:ring-primary`}
      onFocus={onCurrent}
      onKeyDown={(event) => {
        if (
          event.target !== event.currentTarget ||
          event.nativeEvent.isComposing ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        if (event.key === "j" && isLast) {
          event.preventDefault();
          onLoadNext();
        } else if (event.key === "k" && isFirst) {
          event.preventDefault();
        } else if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          void toggleDetails();
        }
      }}
    >
      <td className="px-2 py-2">
        <Badge
          className="px-1.5 text-[11px]"
          variant={answer.is_correct ? "default" : "destructive"}
        >
          {answer.is_correct ? "正解" : "不正解"}
        </Badge>
      </td>
      <td className="min-w-0 px-1 py-2 md:px-2">
        <QuizTypeBadge
          quizType={item.quiz_type}
          className="max-w-full justify-center px-1 text-center text-[10px] whitespace-normal md:px-1.5 md:text-xs"
        />
      </td>
      <td className="min-w-0 space-y-1 px-2 py-2 text-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {resourceName && (
            <Link
              className="truncate text-xs text-muted-foreground hover:underline md:hidden"
              to={`/resource/${item.resource_id}`}
            >
              {resourceName}
            </Link>
          )}
        </div>
        <div className="break-words leading-snug">
          <QuizPrompt quiz={quiz} compact showTypeBadge={false} />
        </div>
      </td>
      <td className="hidden min-w-0 px-2 py-2 text-xs md:block">
        {resourceName ? (
          <Link
            className="block truncate hover:underline"
            title={resourceName}
            to={`/resource/${item.resource_id}`}
          >
            {resourceName}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="space-y-1 px-2 py-2 text-xs">
        <time
          className="block leading-tight"
          dateTime={answer.created}
          title={new Date(answer.created).toLocaleString("ja-JP")}
        >
          {formatAnswerDate(answer.created)}
        </time>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1.5 md:hidden"
          aria-label={isExpanded ? "詳細を閉じる" : "クイズ詳細を見る"}
          aria-expanded={isExpanded}
          onClick={toggleDetails}
        >
          {isExpanded ? "閉じる" : "詳細"}
        </Button>
      </td>
      <td className="hidden px-2 py-2 md:block">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          aria-label={isExpanded ? "詳細を閉じる" : "クイズ詳細を見る"}
          aria-expanded={isExpanded}
          onClick={toggleDetails}
        >
          {isExpanded ? "閉じる" : "見る"}
        </Button>
      </td>
      {isExpanded && (
        <td
          colSpan={6}
          className="col-span-full space-y-2 border-t bg-muted/15 px-3 py-3"
        >
          {isLoading && (
            <p className="text-sm text-muted-foreground">
              知識を読み込んでいます…
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {chain && (
            <div className="space-y-2">
              {problemSentences && problemSentences.length > 0 && (
                <div className="space-y-1 border-b pb-2 text-sm">
                  <p className="text-xs text-muted-foreground">問題の単文</p>
                  {problemSentences.map((sentence) => (
                    <Link
                      key={sentence.uid}
                      to={`/tanbun/${sentence.uid}`}
                      className="block text-primary underline underline-offset-2"
                    >
                      {sentence.sentence}
                    </Link>
                  ))}
                </div>
              )}
              {Object.entries(quiz.options).map(([id, label]) => {
                const selected = answer.selected.includes(id);
                const correct = quiz.correct.includes(id);
                return (
                  <div
                    key={id}
                    className="flex flex-wrap items-baseline gap-2 rounded-md border bg-background p-2 text-sm"
                  >
                    <ChainSentenceLink chain={chain} sentenceId={id}>
                      {quizOptionLabel(quiz, label)}
                    </ChainSentenceLink>
                    <RelationAnnotation chain={chain} sentenceId={id} />
                    {correct && <Badge>正解</Badge>}
                    {selected && !correct && (
                      <Badge variant="destructive">あなたの回答</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <QuizReportButton quizId={quiz.quiz_id} />
        </td>
      )}
    </tr>
  );
}
