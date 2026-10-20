import type { DirectedGraph } from "graphology";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import type { SentenceQuizStatus } from "~/features/quiz/api";
import type {
  ResourceDetailTerms,
  ResourceDetailUids,
  ResourceInfo,
} from "~/shared/generated/fastAPI.schemas";
import { resourceMetadataSentenceIds } from "./util";

export type ResourceDetailContextState = {
  graph: DirectedGraph;
  uids: ResourceDetailUids;
  terms: ResourceDetailTerms;
  rootId: string;
  resource_info: ResourceInfo;
  sentenceQuizStatuses?: ReadonlyMap<string, SentenceQuizStatus>;
  refreshSentenceQuizStatuses?: () => Promise<void>;
  metadataSentenceIds?: ReadonlySet<string>;
};

const ResourceDetailContext = createContext<
  ResourceDetailContextState | undefined
>(undefined);

export function useResourceDetail() {
  const context = useOptionalResourceDetail();
  if (!context) {
    throw new Error(
      "useResourceDetail must be used within a ResourceDetailProvider",
    );
  }
  return context;
}

export function useOptionalResourceDetail() {
  return useContext(ResourceDetailContext);
}

export const ResourceDetailProvider = ({
  children,
  ...state
}: { children: ReactNode } & ResourceDetailContextState) => {
  const { rootId, graph, uids, terms } = state;
  const metadataSentenceIds = useMemo(
    () => resourceMetadataSentenceIds(rootId, graph, uids, terms),
    [rootId, graph, uids, terms],
  );
  return (
    <ResourceDetailContext.Provider value={{ ...state, metadataSentenceIds }}>
      {children}
    </ResourceDetailContext.Provider>
  );
};
