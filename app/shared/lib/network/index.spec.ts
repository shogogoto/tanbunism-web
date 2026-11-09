import { DirectedGraph } from "graphology";
import { ladder } from "graphology-generators/classic";
import { eqEdgeType, pathsToEnd, pred, succ } from ".";

function fixture() {
  // 0→1→2
  // ↓ ↓ ↓
  // 1→3→5
  const g = ladder(DirectedGraph, 3);
  g.edges().forEach((e) => {
    g.setEdgeAttribute(e, "etype", "below");
  });
  return g;
}

describe("グラフユーティリティ", () => {
  it("ignores cycles without losing converging paths to actual endpoints", () => {
    const graph = new DirectedGraph();
    for (const node of ["a", "b", "c", "end"]) graph.addNode(node);
    for (const [from, to] of [
      ["a", "b"],
      ["b", "a"],
      ["a", "c"],
      ["c", "b"],
      ["b", "end"],
    ])
      graph.addEdge(from, to, { etype: "below" });
    expect(pathsToEnd(graph, "a", eqEdgeType("below"), succ)).toEqual([
      ["a", "b", "end"],
      ["a", "c", "b", "end"],
    ]);
  });

  it("does not invent endpoints for a closed cycle or a self-loop", () => {
    const graph = new DirectedGraph();
    graph.addNode("a");
    graph.addNode("b");
    graph.addEdge("a", "a", { etype: "below" });
    graph.addEdge("a", "b", { etype: "below" });
    graph.addEdge("b", "a", { etype: "below" });
    expect(pathsToEnd(graph, "a", eqEdgeType("below"), succ)).toEqual([]);
  });

  it("handles deep paths without recursive stack growth", () => {
    const graph = new DirectedGraph();
    const count = 12000;
    for (let i = 0; i < count; i++) {
      graph.addNode(String(i));
      if (i) graph.addEdge(String(i - 1), String(i), { etype: "below" });
    }
    const result = pathsToEnd(graph, "0", eqEdgeType("below"), succ);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(count);
    expect(result[0].at(-1)).toBe(String(count - 1));
  });
  it("succ", () => {
    expect(succ(fixture(), "0", eqEdgeType("below"))).to.members(["1", "3"]);
    expect(succ(fixture(), "5", eqEdgeType("below"))).to.members([]);
    expect(succ(fixture(), "0", eqEdgeType("to"))).toEqual([]);
  });
  it("pred", () => {
    expect(pred(fixture(), "5", eqEdgeType("below"))).to.members(["2", "4"]);
    expect(pred(fixture(), "0", eqEdgeType("below"))).to.members([]);
  });

  it("succ pathsToEnd", () => {
    expect(pathsToEnd(fixture(), "0", eqEdgeType("below"), succ)).toEqual([
      ["0", "1", "2", "5"],
      ["0", "1", "4", "5"],
      ["0", "3", "4", "5"],
    ]);
    expect(pathsToEnd(fixture(), "1", eqEdgeType("below"), succ)).toEqual([
      ["1", "2", "5"],
      ["1", "4", "5"],
    ]);
    expect(pathsToEnd(fixture(), "5", eqEdgeType("below"), succ)).toEqual([]);
  });
});
