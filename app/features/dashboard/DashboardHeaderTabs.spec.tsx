import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import DashboardHeaderTabs from "./DashboardHeaderTabs";

it("Ctrl+数字で選べる番号を各タブへ表示する", () => {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <DashboardHeaderTabs />
    </MemoryRouter>,
  );

  const timeline = screen.getByRole("tab", { name: "TL" });
  const notes = screen.getByRole("tab", { name: "読書メモ" });

  expect(timeline).toHaveAttribute("title", "Ctrl+1");
  expect(timeline.querySelector("kbd")).toHaveTextContent("1");
  expect(notes).toHaveAttribute("title", "Ctrl+6");
  expect(notes.querySelector("kbd")).toHaveTextContent("6");
});
