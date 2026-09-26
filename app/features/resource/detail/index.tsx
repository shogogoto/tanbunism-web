import { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  type SentenceQuizStatus,
  listCreatedQuizSentences,
} from "~/features/quiz/api";
import EntryBreadcrumb from "~/features/resource/EntryBreadcrumb";
import Loading from "~/shared/components/Loading";
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
    swr: {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  });

  const { data: quizStatuses = [], mutate: mutateQuizStatuses } = useSWR<
    SentenceQuizStatus[]
  >(
    ["resource-quiz-sentence-statuses", id],
    () => listCreatedQuizSentences(id),
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
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
    return <div>Error loading resource.</div>;
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
