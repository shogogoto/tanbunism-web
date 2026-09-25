import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge } from "~/shared/components/ui/badge";
import { Button } from "~/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/shared/components/ui/card";
import { ChainSentenceLink, RelationAnnotation } from "./QuizKnowledge";
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
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">回答履歴</h1>
          <p className="text-sm text-muted-foreground">
            最近の回答を確認し、間違えたクイズを復習します。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/quiz/list">作成したクイズ</Link>
          </Button>
          <Button asChild>
            <Link to="/quiz">クイズを解く</Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-3">
          <label className="grid gap-1 text-sm">
            正誤
            <select
              value={correct}
              onChange={(event) =>
                updateFilter(() =>
                  setCorrect(event.target.value as CorrectFilter),
                )
              }
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="">すべて</option>
              <option value="false">不正解</option>
              <option value="true">正解</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            QuizType
            <select
              value={quizType}
              onChange={(event) =>
                updateFilter(() =>
                  setQuizType(event.target.value as QuizType | ""),
                )
              }
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="">すべて</option>
              {Object.entries(quizTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Resource
            <select
              value={resourceId}
              onChange={(event) =>
                updateFilter(() => setResourceId(event.target.value))
              }
              className="h-10 rounded-md border bg-background px-3"
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

      {isLoading && (
        <p className="text-sm text-muted-foreground">読み込み中…</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!isLoading && !error && items.length === 0 && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          条件に一致する回答はありません。
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <AnswerCard
            key={item.answer.answer_uid}
            item={item}
            resourceName={resourceNames.get(
              item.resource_id.replaceAll("-", ""),
            )}
          />
        ))}
      </div>

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

function AnswerCard({
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
    <Card>
      <CardHeader className="space-y-2">
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Badge variant={answer.is_correct ? "default" : "destructive"}>
            {answer.is_correct ? "正解" : "不正解"}
          </Badge>
          <Badge variant="outline">{quizTypeLabels[item.quiz_type]}</Badge>
          {resourceName && (
            <Link
              className="hover:underline"
              to={`/resource/${item.resource_id}`}
            >
              {resourceName}
            </Link>
          )}
          <time>{new Date(answer.created).toLocaleString("ja-JP")}</time>
        </CardDescription>
        <CardTitle className="whitespace-pre-line text-base leading-relaxed">
          {quiz.statement}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-1 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">あなたの回答: </span>
            {answer.selected.length > 0
              ? answer.selected.map((id) => quiz.options[id] ?? id).join(" / ")
              : "選択なし"}
          </p>
          <p>
            <span className="text-muted-foreground">正解: </span>
            {quiz.correct.map((id) => quiz.options[id] ?? id).join(" / ") ||
              "正解なし"}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={toggleDetails}>
          {isExpanded ? "詳細を閉じる" : "クイズ詳細を見る"}
        </Button>
        {isExpanded && isLoading && (
          <p className="text-sm text-muted-foreground">
            知識を読み込んでいます…
          </p>
        )}
        {isExpanded && error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {isExpanded && chain && (
          <div className="space-y-2 border-t pt-3">
            {Object.entries(quiz.options).map(([id, label]) => {
              const selected = answer.selected.includes(id);
              const correct = quiz.correct.includes(id);
              return (
                <div
                  key={id}
                  className="flex flex-wrap items-baseline gap-2 rounded-md border p-2 text-sm"
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
      </CardContent>
    </Card>
  );
}
