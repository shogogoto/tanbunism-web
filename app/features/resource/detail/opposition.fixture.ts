import { toGraph } from "~/shared/lib/network";
import { resourceDetailFiture } from "./fixture";

export function resourceOppositionFixture(reverse = false) {
  const { resource_info } = resourceDetailFiture;
  const rootId = resource_info.resource.uid;
  return {
    rootId,
    resource_info,
    terms: {},
    uids: {
      [rootId]: "# 反対関係のメモ",
      optimism: "未来を明るく見る",
      pessimism: "未来を暗く見る",
      detail: "最悪の場合を想定して備える",
    },
    graph: toGraph({
      directed: true,
      multigraph: true,
      graph: {},
      nodes: [rootId, "optimism", "pessimism", "detail"].map((id) => ({ id })),
      edges: [
        { key: 0, source: rootId, target: "optimism", type: "below" },
        {
          key: 1,
          source: reverse ? "pessimism" : "optimism",
          target: reverse ? "optimism" : "pessimism",
          type: "anti",
        },
        { key: 2, source: "pessimism", target: "detail", type: "below" },
      ],
    }),
  };
}
