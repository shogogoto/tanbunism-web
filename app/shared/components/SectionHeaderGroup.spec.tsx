import { render, screen } from "@testing-library/react";
import SectionHeaderGroup from "./SectionHeaderGroup";

it("centers tabs and related controls as one compact group", () => {
  render(
    <SectionHeaderGroup actions={<button type="button">設定</button>}>
      <nav aria-label="タブ">タブ</nav>
    </SectionHeaderGroup>,
  );
  const group = screen.getByRole("navigation").parentElement?.parentElement;
  expect(group).toHaveClass(
    "mx-auto",
    "w-fit",
    "max-w-full",
    "justify-center",
    "flex-wrap",
  );
  const actions = screen.getByRole("button", { name: "設定" }).parentElement;
  expect(actions).toHaveClass("border-l", "pl-3");
  expect(actions).not.toHaveClass("ml-auto");
});

it("does not show a separator when no actions are available", () => {
  const { container } = render(
    <SectionHeaderGroup>
      <nav aria-label="タブ">タブ</nav>
    </SectionHeaderGroup>,
  );
  expect(container.querySelector(".border-l")).toBeNull();
});
