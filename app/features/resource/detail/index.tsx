import { useCallback, useEffect, useState } from "react";
import {
  type SentenceQuizStatus,
  listCreatedQuizSentences,
} from "~/features/quiz/api";
import Loading from "~/shared/components/Loading";
import { Separator } from "~/shared/components/ui/separator";
import { useGetResourceDetailResourceResourceIdGet } from "~/shared/generated/entry/entry";
import { useHistory } from "~/shared/history/hooks";
import { toGraph } from "~/shared/lib/network";
import Backbone from "./Backbone";
import { ResourceDetailProvider } from "./Context";
import Presenter from "./Presenter";
import ResourceMeta from "./ResourceMeta";
import { TraceMemoryProvider } from "./TraceMemory/Context";
import UserHeader from "./UserHeader";

type Props = {
  id: string;
};

export default function ResourceDetail({ id }: Props) {
  const { addHistory } = useHistory();
  const [sentenceQuizStatuses, setSentenceQuizStatuses] = useState<
    ReadonlyMap<string, SentenceQuizStatus>
  >(new Map());
  const {
    data: apiResult,
    error,
    isLoading,
  } = useGetResourceDetailResourceResourceIdGet(id);

  const refreshSentenceQuizStatuses = useCallback(async () => {
    const statuses = await listCreatedQuizSentences(id);
    setSentenceQuizStatuses(
      new Map(statuses.map((status) => [status.sentence_id, status])),
    );
  }, [id]);

  useEffect(() => {
    void refreshSentenceQuizStatuses().catch(() => {
      setSentenceQuizStatuses(new Map());
    });
  }, [refreshSentenceQuizStatuses]);

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
        <div className="markdown-body p-4">
          <UserHeader user={user} />
          <ResourceMeta info={resource_info} />
          {/* <ResourceStats stats={resource_stats} /> */}
          <Separator className="my-4" />
          <Presenter id={resource.uid} />
          <Backbone startId={resource.uid} key={id} />
        </div>
      </TraceMemoryProvider>
    </ResourceDetailProvider>
  );
}
