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
  const paths: string[][] = [];
  const path = [start];
  const active = new Set(path);
  const stack = [
    { node: start, next: accessor(g, start, predicate), index: 0 },
  ];
  // Track nodes per path, not globally: converging branches are distinct paths.
  // Explicit frames also avoid a call-stack overflow on deeply nested notes.
  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.index === frame.next.length) {
      if (frame.next.length === 0 && path.length > 1) paths.push([...path]);
      stack.pop();
      path.pop();
      active.delete(frame.node);
      continue;
    }
    const next = frame.next[frame.index++];
    if (active.has(next)) continue;
    active.add(next);
    path.push(next);
    stack.push({ node: next, next: accessor(g, next, predicate), index: 0 });
  }
  return paths;
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
