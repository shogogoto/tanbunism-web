import { useCallback, useEffect, useMemo } from "react";
import { Link } from "react-router";
import {
  type SentenceQuizStatus,
  listCreatedQuizSentences,
} from "~/features/quiz/api";
import { useQuizSWR } from "~/features/quiz/useQuizSWR";
import EntryBreadcrumb from "~/features/resource/EntryBreadcrumb";
import Loading from "~/shared/components/Loading";
import { buttonVariants } from "~/shared/components/ui/button";
import { Separator } from "~/shared/components/ui/separator";
import { useGetResourceDetailResourceResourceIdGet } from "~/shared/generated/entry/entry";
import { useHistory } from "~/shared/history/hooks";
import { toGraph } from "~/shared/lib/network";
import Backbone from "./Backbone";
import { ResourceDetailProvider } from "./Context";
import Presenter from "./Presenter";
import ResourceMeta from "./ResourceMeta";
import ResourceStats from "./ResourceStats";
import { TraceMemoryProvider } from "./TraceMemory/Context";

type Props = {
  id: string;
};

export default function ResourceDetail({ id }: Props) {
  const { addHistory } = useHistory();
  const {
    data: apiResult,
    error,
    isLoading,
  } = useGetResourceDetailResourceResourceIdGet(id, {
    swr: {},
  });

  const { data: quizStatuses = [], mutate: mutateQuizStatuses } = useQuizSWR<
    SentenceQuizStatus[]
  >(
    ["resource-quiz-sentence-statuses", id],
    (cacheOptions) => listCreatedQuizSentences(id, cacheOptions),
    {},
  );
  const sentenceQuizStatuses = useMemo<ReadonlyMap<string, SentenceQuizStatus>>(
    () => new Map(quizStatuses.map((status) => [status.sentence_id, status])),
    [quizStatuses],
  );

  const refreshSentenceQuizStatuses = useCallback(async () => {
    await mutateQuizStatuses();
  }, [mutateQuizStatuses]);

  useEffect(() => {
    if (apiResult?.status === 200) {
      addHistory({ title: apiResult.data.resource_info.resource.name });
    }
  }, [addHistory, apiResult]);

  if (isLoading) {
    return <Loading />;
  }
  if (error || !apiResult || apiResult.status !== 200) {
    const response = apiResult as
      | {
          status: number;
          data?: { message?: string; detail?: { message?: string } };
        }
      | undefined;
    const isIncomplete = response?.status === 409;
    const message = isIncomplete
      ? (response.data?.detail?.message ??
        response.data?.message ??
        "Resourceの取り込みが完了していません。同じ読書メモを再importしてください。")
      : "Resourceを読み込めませんでした。通信状態を確認して再読み込みしてください。";
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h2 className="font-semibold">
            {isIncomplete ? "取り込みが未完了です" : "Resourceを開けません"}
          </h2>
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex flex-wrap gap-2">
            {isIncomplete && (
              <Link to="/import" className={buttonVariants({ size: "sm" })}>
                読書メモimportへ
              </Link>
            )}
            <button
              type="button"
              className={buttonVariants({ variant: "outline", size: "sm" })}
              onClick={() => window.location.reload()}
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { g, resource_info, uids, terms } = apiResult.data;
  const { user, resource, resource_stats } = resource_info;
  const graph = toGraph(g);

  return (
    <ResourceDetailProvider
      graph={graph}
      terms={terms}
      uids={uids}
      rootId={resource.uid}
      resource_info={resource_info}
      sentenceQuizStatuses={sentenceQuizStatuses}
      refreshSentenceQuizStatuses={refreshSentenceQuizStatuses}
    >
      <TraceMemoryProvider>
        <div className="mx-auto max-w-5xl">
          <div className="markdown-body p-4 sm:p-6">
            <EntryBreadcrumb
              user={user}
              folders={resource_info.folders ?? resource.path}
              resource={resource}
            />
            <Presenter id={resource.uid} />
            <ResourceMeta info={resource_info} />
            <ResourceStats stats={resource_stats} resourceId={resource.uid} />
            <Separator className="my-4" />
            <Backbone startId={resource.uid} key={id} />
          </div>
        </div>
      </TraceMemoryProvider>
    </ResourceDetailProvider>
  );
}
