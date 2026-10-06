import { describe, expect, it } from "vitest";
import { quizOptionLabel, relationQuestion } from "./relationPresentation";

describe("relationPresentation", () => {
  it.each([
    ["親", "親"],
    ["詳細", "詳細"],
    ["同階層", "同階層"],
    ["前提", "前提"],
    ["結論", "結論"],
    ["用語参照", "用語参照（AがBを参照）"],
    ["被参照", "被参照（BがAを参照）"],
    ["一般", "一般"],
    ["具体例", "具体例"],
    ["親の親", "親の親"],
    ["用語参照の親", "用語参照の親"],
  ])("関係選択肢 %s を短く表示する", (option, expected) => {
    expect(quizOptionLabel({ quiz_type: "pair2rel" }, option)).toBe(expected);
  });

  it.each([
    ["BELOW", true, "Aの詳細にあたる単文は？"],
    ["BELOW", false, "Aの親にあたる単文は？"],
    ["TO", true, "Aから導かれる結論は？"],
    ["TO", false, "Aの前提となる単文は？"],
    ["RESOLVED", false, "Aが参照している単文は？"],
    ["RESOLVED", true, "Aを参照している単文は？"],
    ["EXAMPLE", true, "Aの具体例にあたる単文は？"],
    ["EXAMPLE", false, "Aを一般化した単文は？"],
    ["SIBLING", true, "Aと同じ階層の単文は？"],
    ["SIBLING", false, "Aと同じ階層の単文は？"],
  ])("%s (%s) の向きを文章にする", (name, is_forward, expected) => {
    expect(relationQuestion([{ name, is_forward }])).toBe(expected);
  });

  it("複数段の関係を順番通りに読む", () => {
    expect(
      relationQuestion([
        { name: "RESOLVED", is_forward: false },
        { name: "BELOW", is_forward: false },
      ]),
    ).toBe("「Aが参照している単文」の親にあたるのは？");
  });

  it("単文や用語の選択肢は言い換えない", () => {
    expect(quizOptionLabel({ quiz_type: "term2sent" }, "親")).toBe("親");
    expect(quizOptionLabel({ quiz_type: "sent2term" }, "親の親")).toBe(
      "親の親",
    );
    expect(quizOptionLabel({ quiz_type: "rel2pair" }, "用語参照")).toBe(
      "用語参照",
    );
  });

  it("未知の関係の意味を推測しない", () => {
    expect(quizOptionLabel({ quiz_type: "pair2rel" }, "未知の関係")).toBe(
      "未知の関係",
    );
    expect(relationQuestion([{ name: "OTHER", is_forward: false }])).toBe(
      "Aから「OTHER（逆方向）」の順にたどった単文は？",
    );
    expect(relationQuestion()).toBe("Aと関係する単文は？");
  });
});
