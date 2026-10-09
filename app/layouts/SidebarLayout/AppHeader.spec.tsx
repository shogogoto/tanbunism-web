import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import AppHeader from "./AppHeader";

it.each(["/game", "/game/adventure", "/game/status/", "/game/item/"])(
  "keeps the game title at %s",
  (path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(screen.getByText("ゲーム")).toBeVisible();
  },
);

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
  const login = screen.getByRole("link", { name: "ログイン" });
  expect(login).toHaveAttribute("href", "/login");
  expect(screen.getByRole("link", { name: "新規作成" })).toHaveAttribute(
    "href",
    "/register",
  );
  expect(login.closest("nav")).toHaveClass("hidden", "md:flex");
  expect(login.closest(".md\\:hidden")).toBeNull();
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
  const xp = screen.getByRole("link", {
    name: "レベル3、現在70 / 250 XP、累計270 XP",
  });
  expect(xp).toHaveAttribute("href", "/user/learner");
  expect(xp).toHaveClass("hidden", "md:flex");
  expect(screen.getByText("70 / 250 XP")).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "ログイン" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "新規作成" }),
  ).not.toBeInTheDocument();
});
