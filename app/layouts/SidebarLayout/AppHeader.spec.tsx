import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import AppHeader from "./AppHeader";

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: undefined, isAuthenticated: false }),
}));

vi.mock("~/shared/components/theme/ThemeToggle", () => ({
  default: () => <button type="button">テーマ</button>,
}));

vi.mock("~/shared/history/HistoryPanel", () => ({
  HistoryPanel: () => <button type="button">履歴</button>,
}));

it("主要機能を固定ヘッダーから移動できる", () => {
  render(
    <MemoryRouter initialEntries={["/quiz"]}>
      <AppHeader />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Tanbun トップ" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.getByRole("link", { name: "ドキュメント" })).toHaveAttribute(
    "href",
    "/docs/toc",
  );
  expect(screen.getByRole("link", { name: "検索" })).toHaveAttribute(
    "href",
    "/search",
  );
  expect(screen.getByRole("link", { name: "クイズ" })).toHaveAttribute(
    "href",
    "/quiz",
  );
  expect(screen.getByRole("link", { name: "作成したクイズ" })).toHaveAttribute(
    "href",
    "/quiz/list",
  );
  expect(screen.getByRole("link", { name: "学習記録" })).toHaveAttribute(
    "href",
    "/achievement",
  );
  expect(screen.getByRole("button", { name: "履歴" })).toBeVisible();
});
