import { describe, expect, it } from "vitest";
import { isStaleBundleError } from "./root";

describe("isStaleBundleError", () => {
  it.each([
    "ChunkLoadError: Loading chunk 42 failed",
    "Failed to fetch dynamically imported module",
    "module script failed to load",
  ])("更新前のbundleに起因しやすいエラーを判定する: %s", (message) => {
    expect(isStaleBundleError(new Error(message))).toBe(true);
  });

  it("通常の実行時エラーはbundle不整合と断定しない", () => {
    expect(
      isStaleBundleError(new Error("Cannot read properties of undefined")),
    ).toBe(false);
  });
});
