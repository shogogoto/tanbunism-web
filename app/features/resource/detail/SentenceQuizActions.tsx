import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import {
  type ReadableQuiz,
  createRelationQuiz,
  createSentenceQuiz,
  listCreatedQuizzes,
} from "~/features/quiz/api";
import { Button } from "~/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/shared/components/ui/dropdown-menu";
import { cn } from "~/shared/lib/utils";
import { useOptionalResourceDetail } from "./Context";
import { getHeadingLevel } from "./util";

function prependQuiz(
  quizzes: ReadableQuiz[] | undefined,
  quiz: ReadableQuiz,
): ReadableQuiz[] {
  return [
    quiz,
    ...(quizzes ?? []).filter(({ quiz_id }) => quiz_id !== quiz.quiz_id),
  ];
}

type QuizType = "sent2term" | "term2sent";
type RelationQuizType = "rel2pair" | "pair2rel";

const relationLabels: Record<string, string> = {
  to: "依存",
  example: "具体例",
  anti: "反対",
  similar: "類似",
  resolved: "用語参照",
  def: "定義",
  quoterm: "引用用語",
  when: "時",
  where: "場所",
  by: "人物",
  ref: "参照",
  num: "数値",
  below: "配下",
  sibling: "並列",
};

export default function SentenceQuizActions({
  sentenceId,
  resourceId,
  className,
  compact = false,
  detailHref,
}: {
  sentenceId: string;
  resourceId?: string;
  className?: string;
  compact?: boolean;
  detailHref?: string;
}) {
  const resourceDetail = useOptionalResourceDetail();
  const rootId = resourceId ?? resourceDetail?.rootId;
  const graph = resourceDetail?.graph;
  const terms = resourceDetail?.terms;
  const uids = resourceDetail?.uids;
  const sentenceQuizStatuses = resourceDetail?.sentenceQuizStatuses;
  const refreshSentenceQuizStatuses =
    resourceDetail?.refreshSentenceQuizStatuses;
  const [isCreating, setIsCreating] = useState(false);
  const [relationQuizType, setRelationQuizType] = useState<RelationQuizType>();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<ReadableQuiz[]>();
  const [error, setError] = useState<string>();
  const status = sentenceQuizStatuses?.get(sentenceId);
  const relationCandidates =
    !graph || !uids || !terms
      ? []
      : graph.neighbors(sentenceId).flatMap((candidateId) => {
          const node = uids[candidateId];
          const sentence =
            typeof node === "string"
              ? node
              : ((node as { n?: string } | undefined)?.n ?? "");
          if (!sentence || getHeadingLevel(sentence) > 0) return [];

          const names = terms[candidateId]?.names?.join(" / ");
          const edgeTypes = graph
            .edges(sentenceId, candidateId)
            .map((edge) => String(graph.getEdgeAttribute(edge, "etype")));
          return [
            {
              id: candidateId,
              label: names ? `${names}: ${sentence}` : sentence,
              relations: [...new Set(edgeTypes)].map(
                (type) => relationLabels[type] ?? type,
              ),
            },
          ];
        });

  async function loadQuizzes() {
    setIsLoading(true);
    setError(undefined);
    try {
      setQuizzes(await listCreatedQuizzes(rootId, sentenceId));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "クイズを取得できませんでした。",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleQuizzes() {
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    setIsExpanded(true);
    await loadQuizzes();
  }

  async function create(quizType: QuizType) {
    setIsCreating(true);
    setError(undefined);
    try {
      const created = await createSentenceQuiz(sentenceId, quizType);
      setQuizzes((current) => prependQuiz(current, created));
      setIsExpanded(true);
      await refreshSentenceQuizStatuses?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "クイズを作成できませんでした。",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function createRelation(relatedSentenceId: string) {
    if (!relationQuizType) return;
    setIsCreating(true);
    setError(undefined);
    try {
      const created = await createRelationQuiz(
        sentenceId,
        relatedSentenceId,
        relationQuizType,
      );
      setQuizzes((current) => prependQuiz(current, created));
      setIsExpanded(true);
      setRelationQuizType(undefined);
      await refreshSentenceQuizStatuses?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "関係クイズを作成できませんでした。",
      );
    } finally {
      setIsCreating(false);
    }
  }

  const creationMenuItems = (
    <>
      <DropdownMenuItem onSelect={() => void create("term2sent")}>
        用語から単文を当てる
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => void create("sent2term")}>
        単文から用語を当てる
      </DropdownMenuItem>
      {relationCandidates.length > 0 && (
        <>
          <DropdownMenuItem onSelect={() => setRelationQuizType("rel2pair")}>
            関係から単文を当てる…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRelationQuizType("pair2rel")}>
            単文ペアから関係を当てる…
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  return (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-1 align-middle",
          compact
            ? "ml-1 opacity-60 focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
            : "ml-2",
          className,
        )}
      >
        {compact ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                aria-label="単文の操作"
                disabled={isCreating}
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {detailHref && (
                <DropdownMenuItem asChild>
                  <Link to={detailHref}>単文詳細を開く</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => void toggleQuizzes()}>
                {isExpanded
                  ? "クイズを閉じる"
                  : status
                    ? `クイズを見る (${status.total_quizzes})`
                    : "クイズを見る"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {creationMenuItems}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              aria-expanded={isExpanded}
              onClick={() => void toggleQuizzes()}
            >
              {isExpanded
                ? "クイズを閉じる"
                : status
                  ? `クイズ ${status.total_quizzes}`
                  : "クイズを見る"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={isCreating}
                >
                  {isCreating ? "作成中…" : "＋ クイズ"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {creationMenuItems}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        {error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        )}
      </span>
      {relationQuizType && (
        <div className="my-2 ml-6 space-y-2 border-l-2 pl-3">
          <p className="text-xs font-medium">
            {relationQuizType === "rel2pair"
              ? "関係から当てる単文を選ぶ"
              : "関係を当てる相手の単文を選ぶ"}
          </p>
          {relationCandidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              disabled={isCreating}
              className="block w-full border p-2 text-left text-xs hover:bg-muted"
              onClick={() => void createRelation(candidate.id)}
            >
              <span className="mr-2 text-muted-foreground">
                {candidate.relations.join(" / ")}
              </span>
              {candidate.label}
            </button>
          ))}
          {relationCandidates.length === 0 && (
            <p className="text-xs text-muted-foreground">
              直接関係する単文がありません。
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRelationQuizType(undefined)}
          >
            閉じる
          </Button>
        </div>
      )}
      {isExpanded && (
        <div className="my-2 ml-6 space-y-2 border-l-2 pl-3">
          {isLoading && (
            <p className="text-xs text-muted-foreground">クイズを読込中…</p>
          )}
          {!isLoading &&
            quizzes?.map((quiz) => (
              <QuizAttempt key={quiz.quiz_id} quiz={quiz} />
            ))}
          {!isLoading && quizzes?.length === 0 && (
            <p className="text-xs text-muted-foreground">
              作成したクイズはありません。
            </p>
          )}
          {rootId && (
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to={`/quiz/list?resource=${rootId}&sentence=${sentenceId}`}>
                一覧で管理
              </Link>
            </Button>
          )}
        </div>
      )}
    </>
  );
}
