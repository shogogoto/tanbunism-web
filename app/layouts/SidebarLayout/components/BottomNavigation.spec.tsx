import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import BottomNavigation from "./BottomNavigation";

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  user: { uid: "user-1", username: "reader" },
}));

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => auth,
}));

vi.mock("~/features/notifications/NotificationProvider", () => ({
  useNotifications: () => ({ unreadCount: 3 }),
}));

beforeEach(() => {
  auth.isAuthenticated = true;
});

it("ログイン中は個人用画面を含む主要導線を表示する", () => {
  render(
    <MemoryRouter initialEntries={["/quiz"]}>
      <BottomNavigation />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "ダッシュボード" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
  expect(screen.getByRole("link", { name: "検索" })).toHaveAttribute(
    "href",
    "/search",
  );
  expect(screen.getByRole("link", { name: "クイズ" })).toHaveAttribute(
    "href",
    "/quiz",
  );
  expect(screen.getByRole("link", { name: "通知" })).toHaveAttribute(
    "href",
    "/notifications",
  );
  expect(screen.getByLabelText("未読3件")).toBeVisible();
  expect(screen.getByRole("link", { name: "プロフィール" })).toHaveAttribute(
    "href",
    "/user/reader",
  );
  expect(
    screen.queryByRole("link", { name: "ガイド" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "ドキュメント" }),
  ).not.toBeInTheDocument();
});

it("未ログインではダッシュボードを表示しない", () => {
  auth.isAuthenticated = false;

  render(
    <MemoryRouter initialEntries={["/search"]}>
      <BottomNavigation />
    </MemoryRouter>,
  );

  expect(
    screen.queryByRole("link", { name: "ダッシュボード" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "検索" })).toBeVisible();
  expect(screen.getByRole("link", { name: "クイズ" })).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "プロフィール" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "通知" })).not.toBeInTheDocument();
});
