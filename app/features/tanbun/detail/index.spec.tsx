import { fixtureDetail1 } from "./fixture";

describe("detail", () => {
  it("aaa", async () => {
    const { uid, g, knowdes, location } = fixtureDetail1;
    const start = uid.replaceAll(/-/g, "");

    // g.setNodeAttribute(start, "x", 0jj
    // console.log(pred(knowdes, cvt, _id, "below"));
    // console.log(pred(knowdes, cvt, _id, "to"));
    // console.log(pred(knowdes, cvt, _id, "resolved"));
    // console.log(pred(knowdes, cvt, _id, "num"));
    // console.log(pred(knowdes, cvt, _id, "sibling"));

    expect(0).toBe(0);
  });
  it("あるtargetのedgeをグルーピング", async () => {
    // console.log("-".repeat(100));
    // groupByEdgeType(cvt, uid);)
    // const g = path(Graph, 4);
    // g.forEachEdge((edge) => {
    //   g.setEdgeAttribute(edge, "type", "some_type");
    // });
    // console.log(typeof cvt.edges());
    // const group = groupByEdgeType(g.edges);
    // console.log({ group: JSON.stringify(group) });
  });
  it("あるtargetのedgeをグルーピング再帰", async () => {});
  it("あるtargetから伸びる同一typeのpath", async () => {});
  it("aaaa", async () => {});
  it("aaaa", async () => {});
});
