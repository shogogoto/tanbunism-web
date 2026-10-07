import { describe, expect, it } from "vitest";
import {
  defaultSearchSettings,
  readSearchSettings,
  writeSearchSettings,
} from "./settings";

describe("検索詳細設定", () => {
  it("PageRank順と対象リソースを保存し、対象なしではスコア順に戻す", () => {
    const settings = {
      ...defaultSearchSettings,
      knowledge: {
        ...defaultSearchSettings.knowledge,
        order: "pagerank" as const,
        resourceId: "resource-1",
      },
    };
    expect(
      readSearchSettings(writeSearchSettings(new URLSearchParams(), settings)),
    ).toEqual(settings);
    expect(
      readSearchSettings(new URLSearchParams("knowledge_order=pagerank"))
        .knowledge.order,
    ).toBe("score");
  });
  it("URLに設定がなければ初期値を使う", () => {
    expect(readSearchSettings(new URLSearchParams())).toEqual(
      defaultSearchSettings,
    );
  });

  it("初期値と異なる設定だけをURLで往復する", () => {
    const settings = {
      ...defaultSearchSettings,
      knowledge: {
        ...defaultSearchSettings.knowledge,
        matchType: "REGEX" as const,
        weights: { ...defaultSearchSettings.knowledge.weights, premise: 4 },
      },
      resource: {
        user: "reader",
        order: "updated" as const,
        desc: false,
      },
      user: { order: "n_resource" as const, desc: false },
    };

    const params = writeSearchSettings(new URLSearchParams("q=数学"), settings);

    expect(params.get("q")).toBe("数学");
    expect(params.has("weight_detail")).toBe(false);
    expect(readSearchSettings(params)).toEqual(settings);
  });
});
