import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import DashboardHeaderTabs from "./DashboardHeaderTabs";

it("Ctrl+数字で選べる番号を各タブへ表示する", () => {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <DashboardHeaderTabs />
    </MemoryRouter>,
  );

  const timeline = screen.getByRole("tab", { name: "復習管理" });
  const notes = screen.getByRole("tab", { name: "リソース" });

  expect(timeline).toHaveAttribute("title", "Ctrl+1");
  expect(timeline.querySelector("kbd")).toHaveTextContent("1");
  expect(notes).toHaveAttribute("title", "Ctrl+5");
  expect(notes.querySelector("kbd")).toHaveTextContent("5");
});

it("選択したタブへ下線indicatorを移動する", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <DashboardHeaderTabs />
    </MemoryRouter>,
  );

  const indicator = container.querySelector("[data-dashboard-tab-indicator]");
  expect(indicator).toHaveAttribute("data-active-tab", "review-settings");

  await user.click(screen.getByRole("tab", { name: "学習計画" }));

  expect(indicator).toHaveAttribute("data-active-tab", "study-plans");
  expect(indicator).toHaveClass("transition-[left,width,opacity]");
});
