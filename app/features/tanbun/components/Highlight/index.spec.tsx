import { render, screen } from "@testing-library/react";
import { Highlight } from "./index";

describe("Highlight", () => {
  it("文言一致あり", () => {
    render(<Highlight text="Hello World" query="World" />);
    const markElement = screen.getByText("World");
    expect(markElement).toBeInTheDocument();
    expect(markElement.tagName).toBe("MARK");
  });

  it("一致なし", () => {
    render(<Highlight text="Hello World" query="Test" />);
    const markElement = screen.queryByText("Test");
    expect(markElement).not.toBeInTheDocument();
  });

  it("空文字ハイライトは何もしない", () => {
    render(<Highlight text="Hello World" query="" />);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("大小文字の違い無視", () => {
    render(<Highlight text="Hello World" query="world" />);
    const markElement = screen.getByText("World");
    expect(markElement).toBeInTheDocument();
    expect(markElement.tagName).toBe("MARK");
  });
});
