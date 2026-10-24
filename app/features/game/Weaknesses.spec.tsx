import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Weaknesses from "./Weaknesses";
import { defaultElements } from "./catalog";

it("shows named, colored weaknesses and ignores disabled attributes", () => {
  render(
    <Weaknesses
      ids={["fire", "ice"]}
      elements={defaultElements.map((element) =>
        element.id === "ice" ? { ...element, enabled: false } : element,
      )}
    />,
  );
  expect(screen.getByLabelText("弱点属性")).toHaveTextContent("弱点炎");
  expect(screen.queryByText("氷")).not.toBeInTheDocument();
});
it("does not display a weakness panel for neutral enemies", () => {
  render(<Weaknesses />);
  expect(screen.queryByLabelText("弱点属性")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("耐性属性")).not.toBeInTheDocument();
});

it("distinguishes weaknesses from resistances in battle", () => {
  render(<Weaknesses ids={["fire"]} resistances={["ice"]} />);
  expect(screen.getByLabelText("弱点属性")).toHaveTextContent("弱点炎");
  expect(screen.getByLabelText("耐性属性")).toHaveTextContent("耐性氷");
});
