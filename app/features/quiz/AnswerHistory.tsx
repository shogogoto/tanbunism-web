import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import Loading from "~/shared/components/Loading";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/card";
import { ChainSentenceLink, RelationAnnotation } from "./QuizKnowledge";
import QuizPrompt from "./QuizPrompt";
import {
  type AnswerHistoryItem,
  type QuizChain,
  type QuizType,
  type StudyResource,
  getQuizChain,
  listAnswerHistory,
  listStudyResources,
} from "./api";

const quizTypeLabels: Record<QuizType, string> = {
  term2sent: "用語 → 単文",
  sent2term: "単文 → 用語",
  rel2pair: "関係 → 単文組",
  pair2rel: "単文組 → 関係",
};

type CorrectFilter = "" | "true" | "false";

const answerRowGrid =
  "grid grid-cols-[3.75rem_minmax(0,1fr)_5.5rem] md:grid-cols-[4.5rem_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_7rem_4rem]";

export default function AnswerHistory() {
  const [items, setItems] = useState<AnswerHistoryItem[]>([]);
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [correct, setCorrect] = useState<CorrectFilter>("");
  const [quizType, setQuizType] = useState<QuizType | "">("");
  const [resourceId, setResourceId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const pageSize = 20;

  useEffect(() => {
    listStudyResources()
      .then(setResources)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(undefined);
    listAnswerHistory({
      is_correct: correct === "" ? undefined : correct === "true",
      quiz_type: quizType || undefined,
      resource_id: resourceId || undefined,
      page,
      size: pageSize,
    })
      .then((result) => {
        if (!active) return;
        setItems(result.data);
        setTotal(result.total);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "回答履歴を取得できませんでした。",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [correct, page, quizType, resourceId]);

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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function updateFilter(update: () => void) {
    setPage(1);
    update();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-2 p-2 sm:p-3">
      <Card className="sticky top-0 z-30 h-24 gap-0 bg-background py-0 shadow-sm md:h-13">
        <CardContent className="grid h-full grid-cols-2 items-center gap-2 p-2 md:flex">
          <label className="flex min-w-0 items-center gap-1.5 text-xs">
            <span>正誤</span>
            <select
              value={correct}
              onChange={(event) =>
                updateFilter(() =>
                  setCorrect(event.target.value as CorrectFilter),
                )
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
                updateFilter(() =>
                  setQuizType(event.target.value as QuizType | ""),
                )
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
                updateFilter(() => setResourceId(event.target.value))
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

      {isLoading && <Loading />}
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
              <span className="md:hidden">問題・回答</span>
              <span className="hidden md:inline">問題</span>
            </th>
            <th scope="col" className="hidden px-2 py-2 md:block">
              あなたの回答
            </th>
            <th scope="col" className="hidden px-2 py-2 md:block">
              正解
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
              resourceName={resourceNames.get(
                item.resource_id.replaceAll("-", ""),
              )}
            />
          ))}
        </tbody>
      </table>

      {total > pageSize && (
        <nav
          className="flex items-center justify-center gap-3"
          aria-label="回答履歴のページ"
        >
          <Button
            variant="outline"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => current - 1)}
          >
            前へ
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((current) => current + 1)}
          >
            次へ
          </Button>
        </nav>
      )}
    </div>
  );
}

function AnswerRow({
  item,
  resourceName,
}: {
  item: AnswerHistoryItem;
  resourceName?: string;
}) {
  const [chain, setChain] = useState<QuizChain>();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const { answer, quiz } = item;
  const selectedAnswer =
    answer.selected.length > 0
      ? answer.selected.map((id) => quiz.options[id] ?? id).join(" / ")
      : "選択なし";
  const correctAnswer =
    quiz.correct.map((id) => quiz.options[id] ?? id).join(" / ") || "正解なし";

  async function toggleDetails() {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    setIsExpanded(true);
    if (chain) return;
    setIsLoading(true);
    setError(undefined);
    try {
      setChain(await getQuizChain(quiz.quiz_id));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "クイズ詳細を取得できませんでした。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <tr className={`${answerRowGrid} items-start hover:bg-muted/40`}>
      <td className="px-2 py-2">
        <Badge
          className="px-1.5 text-[11px]"
          variant={answer.is_correct ? "default" : "destructive"}
        >
          {answer.is_correct ? "正解" : "不正解"}
        </Badge>
      </td>
      <td className="min-w-0 space-y-1 px-2 py-2 text-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <Badge variant="outline" className="px-1.5 text-[10px]">
            {quizTypeLabels[item.quiz_type]}
          </Badge>
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
          <QuizPrompt quiz={quiz} compact />
        </div>
        <dl className="space-y-0.5 text-xs md:hidden">
          <div className="flex gap-1">
            <dt className="shrink-0 text-muted-foreground">回答:</dt>
            <dd className="min-w-0 break-words">{selectedAnswer}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="shrink-0 text-muted-foreground">正解:</dt>
            <dd className="min-w-0 break-words">{correctAnswer}</dd>
          </div>
        </dl>
      </td>
      <td className="hidden min-w-0 break-words px-2 py-2 text-sm whitespace-normal md:block">
        {selectedAnswer}
      </td>
      <td className="hidden min-w-0 break-words px-2 py-2 text-sm whitespace-normal md:block">
        {correctAnswer}
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
        <time className="block leading-tight">
          {new Date(answer.created).toLocaleString("ja-JP")}
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
          colSpan={7}
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
              {Object.entries(quiz.options).map(([id, label]) => {
                const selected = answer.selected.includes(id);
                const correct = quiz.correct.includes(id);
                return (
                  <div
                    key={id}
                    className="flex flex-wrap items-baseline gap-2 rounded-md border bg-background p-2 text-sm"
                  >
                    <ChainSentenceLink chain={chain} sentenceId={id}>
                      {label}
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
        </td>
      )}
    </tr>
  );
}
