import { describe, expect, it } from "vitest";
import {
  defaultSearchSettings,
  readSearchSettings,
  writeSearchSettings,
} from "./settings";

describe("検索詳細設定", () => {
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
