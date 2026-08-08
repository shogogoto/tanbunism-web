import type { DirectedGraph } from "graphology";
import Graph from "graphology";
import type { Attributes } from "graphology-types";
import type {
  _EdgeData as EdgeData,
  EdgeType,
  _GraphData as GraphData,
} from "~/shared/generated/fastAPI.schemas";

type EdgePredicate = (attr: Attributes) => boolean;

type Accessor = (g: Graph, n: string, predicate: EdgePredicate) => string[];

export function eqEdgeType(t: EdgeType): EdgePredicate {
  return (attr) => attr.etype === t;
}

export const succ: Accessor = (g, n, predicate) => {
  if (!g.hasNode(n)) return [];
  return g
    .filterOutEdges(n, (_, attr) => predicate(attr))
    .filter((e) => !!e)
    .map((e) => g.target(e));
};

// predecessor
export const pred: Accessor = (g, n, predicate) => {
  if (!g.hasNode(n)) return [];
  return g
    .filterInEdges(n, (_, attr) => predicate(attr))
    .map((e) => g.source(e));
};

// n から 同じtypeのedgeを末まで辿る
export function pathsToEnd(
  g: Graph,
  start: string,
  predicate: EdgePredicate,
  accessor: Accessor,
) {
  const ls: string[][] = [];

  function _f(ns: string[]) {
    const last = ns.at(-1);
    if (!last) throw new Error();
    const accs = accessor(g, last, predicate);
    if (accs.length === 0 && ns.length !== 1) {
      ls.push(ns); // 自身のみのpathは除外
    }
    for (const a of accs) {
      _f([...ns, a]);
    }
  }
  _f([start]);
  return ls;
}

export function operatorGraph(g: Graph, edgeType: EdgeType) {
  const predicate = eqEdgeType(edgeType);
  return {
    succ: (n: string) => succ(g, n, predicate),
    pred: (n: string) => pred(g, n, predicate),
    pathsToEnd: (start: string, predicate: EdgePredicate) =>
      pathsToEnd(g, start, predicate, succ),
  };
}

export function toGraph(g: GraphData): DirectedGraph {
  const { nodes, edges } = g;
  const graph = new Graph({
    multi: true,
    type: "directed",
  });
  function toSerializedEdge(edge: EdgeData) {
    return {
      attributes: {
        etype: edge.type, // type属性はsigma.jsで使われていた
      },
      source: edge.source,
      target: edge.target,
    };
  }

  graph.import({
    nodes: nodes.map((node) => ({ key: node.id })),
    edges: edges.map(toSerializedEdge),
  });

  return graph;
}
