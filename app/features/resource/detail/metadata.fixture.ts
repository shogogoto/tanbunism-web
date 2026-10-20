import { toGraph } from "~/shared/lib/network";
import { resourceDetailFiture } from "./fixture";

export function resourceMetadataFixture() {
  const resource_info = {
    ...resourceDetailFiture.resource_info,
    resource: {
      ...resourceDetailFiture.resource_info.resource,
      authors: ["岡本浩一"],
      published: "2002-05-29",
    },
  };
  const rootId = resource_info.resource.uid;
  const sentences = {
    author: "@岡本浩一",
    published: "@published 2002-05-29",
    url: "@url https://example.com/book",
    explicitAuthor: "@author: 別の著者",
    body: "通常の本文です",
    email: "contact@example.com",
    mention: "@これは本文中のメンション",
  };
  const ids = Object.keys(sentences);
  return {
    rootId,
    resource_info,
    terms: {},
    uids: { [rootId]: "# 上達の法則", ...sentences },
    graph: toGraph({
      directed: true,
      multigraph: true,
      graph: {},
      nodes: [rootId, ...ids].map((id) => ({ id })),
      edges: ids.map((id, index) => ({
        key: index,
        source: index === 0 ? rootId : ids[index - 1],
        target: id,
        type: index === 0 ? "below" : "sibling",
      })),
    }),
  };
}
