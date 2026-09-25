import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import MobileMenu from "./MobileMenu";

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

it("予定機能を並べず補助画面だけを表示する", () => {
  render(
    <MemoryRouter>
      <MobileMenu open onOpenChange={vi.fn()} />
    </MemoryRouter>,
  );

  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.getByRole("link", { name: "作成したクイズ" })).toHaveAttribute(
    "href",
    "/quiz/list",
  );
  expect(screen.getByRole("link", { name: "学習記録" })).toHaveAttribute(
    "href",
    "/achievement",
  );
  expect(screen.getByRole("link", { name: "ドキュメント" })).toHaveAttribute(
    "href",
    "/docs/toc",
  );
  expect(screen.queryByText("その他（予定）")).not.toBeInTheDocument();
});
