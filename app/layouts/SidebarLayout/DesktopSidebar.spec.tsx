import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import DesktopSidebar from "./DesktopSidebar";

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
  expect(screen.getByRole("link", { name: "読書メモimport" })).toHaveAttribute(
    "href",
    "/import",
  );
});
