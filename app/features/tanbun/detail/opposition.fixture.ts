import { fixtureDetail1 } from "./fixture";

/** Only direct opposition is shown; the second edge must not imply transitivity. */
export function oppositionFixture(reverse = false) {
  const detail = structuredClone(fixtureDetail1);
  const rootId = detail.uid.replaceAll("-", "");
  const otherId = "11111111111141118111111111111111";
  const indirectId = "22222222222242228222222222222222";
  const root = detail.knowdes[rootId];
  root.sentence = "未来を明るく見る";
  root.term = { names: ["楽観"], alias: null };
  const stats = {
    ...root.stats,
    n_detail: 0,
    n_premise: 0,
    n_conclusion: 0,
    n_refer: 0,
    n_referred: 0,
    n_anti: 1,
    score: 3,
  };
  root.stats = stats;
  detail.knowdes[otherId] = {
    ...root,
    uid: otherId,
    sentence: "未来を暗く見る",
    term: { names: ["悲観"], alias: null },
  };
  detail.knowdes[indirectId] = {
    ...root,
    uid: indirectId,
    sentence: "未来をまだ判断しない",
    term: null,
  };
  detail.g = {
    ...detail.g,
    nodes: [rootId, otherId, indirectId].map((id) => ({ id })),
    edges: [
      {
        source: reverse ? otherId : rootId,
        target: reverse ? rootId : otherId,
        type: "anti",
        key: 0,
      },
      { source: otherId, target: indirectId, type: "anti", key: 0 },
    ],
  };
  return detail;
}
