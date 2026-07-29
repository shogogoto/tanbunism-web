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
  DropdownMenuTrigger,
} from "~/shared/components/ui/dropdown-menu";
import { useResourceDetail } from "./Context";
import { getHeadingLevel } from "./util";

type QuizType = "sent2term" | "term2sent";

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
}: {
  sentenceId: string;
}) {
  const {
    graph,
    rootId,
    sentenceQuizStatuses,
    refreshSentenceQuizStatuses,
    terms,
    uids,
  } = useResourceDetail();
  const [isCreating, setIsCreating] = useState(false);
  const [isChoosingRelation, setIsChoosingRelation] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<ReadableQuiz[]>();
  const [error, setError] = useState<string>();
  const status = sentenceQuizStatuses?.get(sentenceId);
  const relationCandidates = graph
    .neighbors(sentenceId)
    .flatMap((candidateId) => {
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
      await createSentenceQuiz(sentenceId, quizType);
      await refreshSentenceQuizStatuses?.();
      if (isExpanded) await loadQuizzes();
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
    setIsCreating(true);
    setError(undefined);
    try {
      await createRelationQuiz(sentenceId, relatedSentenceId);
      setIsChoosingRelation(false);
      await refreshSentenceQuizStatuses?.();
      if (isExpanded) await loadQuizzes();
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

  return (
    <>
      <span className="ml-2 inline-flex items-center gap-1 align-middle">
        {status && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            aria-expanded={isExpanded}
            onClick={() => void toggleQuizzes()}
          >
            クイズ {status.total_quizzes}
          </Button>
        )}
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
            <DropdownMenuItem onSelect={() => void create("term2sent")}>
              用語から単文を当てる
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void create("sent2term")}>
              単文から用語を当てる
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setIsChoosingRelation(true)}>
              関係から単文を当てる…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        )}
      </span>
      {isChoosingRelation && (
        <div className="my-2 ml-6 space-y-2 border-l-2 pl-3">
          <p className="text-xs font-medium">正解にする関係先を選ぶ</p>
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
            onClick={() => setIsChoosingRelation(false)}
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
          <Button asChild variant="link" size="sm" className="h-auto p-0">
            <Link to={`/quiz/list?resource=${rootId}&sentence=${sentenceId}`}>
              一覧で管理
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}
