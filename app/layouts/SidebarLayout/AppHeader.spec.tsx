import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import AppHeader from "./AppHeader";

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  user: undefined as
    | { uid: string; username: string; display_name: string }
    | undefined,
}));

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: auth.user, isAuthenticated: auth.isAuthenticated }),
}));

vi.mock("~/shared/generated/gamification/gamification", () => ({
  useGetLearningProgressUserUserIdLearningProgressGet: () => ({
    data: {
      status: 200,
      data: {
        level: 3,
        total_xp: 270,
        current_level_xp: 70,
        xp_for_next_level: 250,
        xp_to_next_level: 180,
      },
    },
  }),
}));

vi.mock("~/shared/components/theme/ThemeToggle", () => ({
  default: () => <button type="button">テーマ</button>,
}));

vi.mock("~/shared/history/HistoryPanel", () => ({
  HistoryPanel: () => <button type="button">履歴</button>,
}));

it("主要機能をヘッダーに表示しない", () => {
  auth.isAuthenticated = false;
  auth.user = undefined;
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
  expect(
    screen.queryByRole("link", { name: "ダッシュボード" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "ドキュメント" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "検索" })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "クイズ" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "作成したクイズ" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "学習記録" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "解く" })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "作成済み" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "履歴" })).toBeVisible();
});

it("ログイン中はロゴからトップを明示的に開ける", () => {
  auth.isAuthenticated = true;
  auth.user = {
    uid: "user-1",
    username: "learner",
    display_name: "学習者",
  };
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <AppHeader />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Tanbun トップ" })).toHaveAttribute(
    "href",
    "/about",
  );
  expect(
    screen.getByRole("link", {
      name: "レベル3、累計270 XP、次のレベルまで180 XP",
    }),
  ).toHaveAttribute("href", "/user/learner");
  expect(screen.getByText("270 XP")).toBeVisible();
});
