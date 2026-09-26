import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import AppHeader from "./AppHeader";

const auth = vi.hoisted(() => ({ isAuthenticated: false }));

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: undefined, isAuthenticated: auth.isAuthenticated }),
}));

vi.mock("~/shared/components/theme/ThemeToggle", () => ({
  default: () => <button type="button">テーマ</button>,
}));

vi.mock("~/shared/history/HistoryPanel", () => ({
  HistoryPanel: () => <button type="button">履歴</button>,
}));

it("主要機能を固定ヘッダーから移動できる", () => {
  auth.isAuthenticated = false;
  render(
    <MemoryRouter initialEntries={["/quiz"]}>
      <AppHeader />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Tanbun トップ" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.queryByText("Tanbun")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "ダッシュボード" })).toHaveAttribute(
    "href",
    "/dashboard",
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
  expect(
    screen.queryByRole("link", { name: "学習記録" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "履歴" })).toBeVisible();
});

it("ログイン中はロゴからトップを明示的に開ける", () => {
  auth.isAuthenticated = true;
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AppHeader />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Tanbun トップ" })).toHaveAttribute(
    "href",
    "/about",
  );
});
