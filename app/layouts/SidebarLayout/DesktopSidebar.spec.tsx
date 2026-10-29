import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import DesktopSidebar from "./DesktopSidebar";
import useSidebarCollapsed, {
  sidebarCollapsedStorageKey,
} from "./useSidebarCollapsed";

it("restores the actual sidebar's toggle state after remount", async () => {
  function PersistentSidebar() {
    const [collapsed, onToggle] = useSidebarCollapsed();
    return (
      <MemoryRouter>
        <DesktopSidebar collapsed={collapsed} onToggle={onToggle} />
      </MemoryRouter>
    );
  }
  const user = userEvent.setup();
  const first = render(<PersistentSidebar />);
  await user.click(screen.getByRole("button", { name: "サイドバーを閉じる" }));
  expect(
    screen.getByRole("button", { name: "サイドバーを開く" }),
  ).toBeVisible();
  first.unmount();
  render(<PersistentSidebar />);
  expect(
    screen.getByRole("button", { name: "サイドバーを開く" }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "サイドバーを開く" }));
  expect(localStorage.getItem(sidebarCollapsedStorageKey)).toBe("false");
  localStorage.removeItem(sidebarCollapsedStorageKey);
});

vi.mock("~/features/game/access", () => ({
  useAdventureAccess: () => ({ data: { available: true } }),
}));

it.each([true, false])(
  "shows adventure availability with collapsed=%s",
  (collapsed) => {
    render(
      <MemoryRouter>
        <DesktopSidebar collapsed={collapsed} onToggle={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status", { name: "冒険可能" })).toBeVisible();
    expect(
      screen.getByRole("status", { name: "冒険可能" }).closest("a"),
    ).toHaveAttribute("href", "/game");
  },
);

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { uid: "user-1", username: "reader" },
  }),
}));

vi.mock("~/features/notifications/NotificationProvider", () => ({
  useNotifications: () => ({ unreadCount: 4 }),
}));

vi.mock("~/features/hotkeys/GlobalHotkeys", () => ({
  HotkeyHelpButton: () => null,
}));

vi.mock("~/shared/components/theme/ThemeToggle", () => ({
  default: () => null,
}));

vi.mock("~/shared/history/HistoryPanel", () => ({
  HistoryPanel: () => null,
}));

vi.mock("./UserNavi", () => ({ default: () => null }));

it("通知を未読数付きの主要メニューとして表示する", () => {
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <DesktopSidebar collapsed={false} onToggle={vi.fn()} />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: /通知/ })).toHaveAttribute(
    "href",
    "/notifications",
  );
  expect(screen.getByLabelText("未読4件")).toBeVisible();
  expect(screen.getByRole("link", { name: "インポート" })).toHaveAttribute(
    "href",
    "/import",
  );
});
