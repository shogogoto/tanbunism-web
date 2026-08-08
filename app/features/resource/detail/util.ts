import type Graph from "graphology";
import type {
  EdgeType,
  ResourceDetailTerms,
  ResourceDetailUids,
  Tanbun,
} from "~/shared/generated/fastAPI.schemas";
import { eqEdgeType, pathsToEnd, pred, succ } from "~/shared/lib/network";

type ResourceTanbun = Omit<Tanbun, "stats" | "resource_uid">;

export function toAdjacent(
  id: string,
  g: Graph,
  uids: ResourceDetailUids,
  terms: ResourceDetailTerms,
) {
  // @ts-ignore
  const when = succ(g, id, eqEdgeType("when")).map((wid) => uids[wid])?.[0]?.n;
  const by = succ(g, id, eqEdgeType("by")).map(
    (bid) => uids[bid],
  )?.[0] as string;
  const where = succ(g, id, eqEdgeType("where")).map(
    (bid) => uids[bid],
  )?.[0] as string;
  const additional = { when, by, where };
  const sentenceNode = uids[id];
  const sentence =
    typeof sentenceNode === "string"
      ? sentenceNode
      : ((sentenceNode as { n: string })?.n ??
        JSON.stringify(sentenceNode) ??
        "<<<not defined>>>");
  const kn: ResourceTanbun = {
    sentence,
    term: terms[id],
    uid: id,
    additional,
  };

  function toSucc(et: EdgeType) {
    return succ(g, id, eqEdgeType(et)).map((sid) =>
      toAdjacent(sid, g, uids, terms),
    );
  }

  function toPred(et: EdgeType) {
    return pred(g, id, eqEdgeType(et)).map((sid) =>
      toAdjacent(sid, g, uids, terms),
    );
  }

  function toEnd(et: EdgeType) {
    return pathsToEnd(g, id, eqEdgeType(et), succ).map((path) => {
      return path.map((sid) => toAdjacent(sid, g, uids, terms))?.slice(1); // 自身を除く
    });
  }

  // 1つ下の階層の一覧を返す
  function downArrays() {
    const retval = [];
    for (const below of toSucc("below")) {
      const siblings = below.toEnd("sibling")[0] || [];
      retval.push([below, ...siblings]);
    }
    return retval;
  }

  function hasName(name: string) {
    return kn.term?.names?.some((n) => n === name);
  }

  return {
    kn,
    toSucc,
    toPred,
    toEnd,
    siblings: () => toSucc("sibling"),
    belows: () => toSucc("below"),
    downArrays,
    conclusions: () => toSucc("to"),
    premises: () => toPred("to"),
    refers: () => toSucc("resolved"),
    referreds: () => toPred("resolved"),
    quoterm: () => toSucc("quoterm"),
    hasName,
  };
}

// below と sibling を 再帰的に返す
//  まずは headerのツリーを作成したい
export function toDetailTree() {}

const HEADING_REGEX = /^#+/;
export function getHeadingLevel(sentence: string): number {
  if (!sentence) {
    return 0;
  }
  const match = sentence.match(HEADING_REGEX);
  return match ? match[0].length : 0;
}
