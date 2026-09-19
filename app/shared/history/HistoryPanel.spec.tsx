import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import { SidebarProvider } from "~/shared/components/ui/sidebar";
import { HistoryPanel } from "./HistoryPanel";

vi.mock("./hooks", () => ({
  useHistory: () => ({
    histories: [
      {
        id: 1,
        title: "単文の履歴",
        url: "/tanbun/1",
        timestamp: 1,
      },
    ],
  }),
}));

vi.mock("~/shared/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

it("必要なときだけ履歴をパネルで表示する", async () => {
  const user = userEvent.setup();

  render(
    <MemoryRouter>
      <SidebarProvider>
        <ul>
          <HistoryPanel />
        </ul>
      </SidebarProvider>
    </MemoryRouter>,
  );

  expect(screen.queryByText("単文の履歴")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "履歴を開く" }));

  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.getByRole("link", { name: "単文の履歴" })).toBeVisible();

  await user.click(screen.getByRole("link", { name: "単文の履歴" }));

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
