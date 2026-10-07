import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { expect, it, vi } from "vitest";
import Dashboard from ".";

vi.mock("~/features/auth/AuthGuard", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("~/features/gamification/ResourceGrowth", () => ({
  ResourceGrowthProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("~/shared/generated/entry/entry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/shared/generated/entry/entry")>()),
  useGetNamaspaceNamespaceGet: () => ({
    data: undefined,
    error: undefined,
    isLoading: true,
    mutate: vi.fn(),
  }),
}));

it("読み込み中も絞り込みの右隣にimportの入口を置く", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/dashboard?view=notes"]}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/import" element={<p>読書メモimport画面</p>} />
      </Routes>
    </MemoryRouter>,
  );
  const link = screen.getByRole("link", { name: "読書メモimport" });
  expect(link).toHaveAttribute("href", "/import");
  expect(link).toHaveAttribute("title", "読書メモimport");
  expect(link.className).not.toContain("fixed");
  const toolbar = link.parentElement;
  expect(toolbar).toContainElement(screen.getByLabelText("リソースを絞り込む"));
  expect(toolbar?.lastElementChild).toBe(link);
  expect(screen.getAllByRole("link", { name: "読書メモimport" })).toHaveLength(
    1,
  );
  await user.click(link);
  expect(screen.getByText("読書メモimport画面")).toBeVisible();
});
