import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HistoryItemIcon } from "./HistoryItemIcon";

describe("HistoryItemIcon", () => {
  it("Entry履歴にフォルダアイコンを表示する", () => {
    const { container } = render(<HistoryItemIcon url="/entry/example" />);

    expect(container.querySelector("svg")).toHaveClass("lucide-folder");
  });
});
