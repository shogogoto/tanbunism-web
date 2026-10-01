import { beforeEach, describe, expect, it } from "vitest";
import { getItem, setItem } from "./storage";

describe("local storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("JSONとして保存した値を復元する", () => {
    setItem("user", { uid: "user-1" });

    expect(getItem("user")).toEqual({ uid: "user-1" });
  });

  it("Themeのような生文字列をそのまま復元する", () => {
    setItem("theme", "dark");

    expect(localStorage.getItem("theme")).toBe("dark");
    expect(getItem("theme")).toBe("dark");
  });
});
