import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationCenter from "./NotificationCenter";
import { NotificationProvider } from "./NotificationProvider";
import {
  getPushConfiguration,
  listNotifications,
  markNotificationRead,
} from "./api";

vi.mock("./api", () => ({
  deletePushSubscription: vi.fn(),
  getPushConfiguration: vi.fn(),
  listNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  savePushSubscription: vi.fn(),
}));

const notification = {
  uid: "10000000-0000-0000-0000-000000000001",
  kind: "quiz_preparation_complete" as const,
  title: "クイズの準備完了",
  description: "3問追加しました。",
  href: "/dashboard?view=study-plans",
  created: "2026-09-29T12:00:00+09:00",
  read_at: null,
};

describe("NotificationCenter", () => {
  beforeEach(() => {
    vi.mocked(listNotifications).mockResolvedValue({
      notifications: [notification],
      unread_count: 1,
    });
    vi.mocked(getPushConfiguration).mockResolvedValue({
      enabled: false,
      public_key: null,
    });
    vi.mocked(markNotificationRead).mockResolvedValue({
      ...notification,
      read_at: "2026-09-29T12:01:00+09:00",
    });
  });

  it("DBの完了通知を表示し、通知先を開くと既読にする", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <NotificationProvider userId="user-1">
          <NotificationCenter />
        </NotificationProvider>
      </MemoryRouter>,
    );

    const trigger = await screen.findByRole("button", {
      name: "通知（未読1件）",
    });
    await user.click(trigger);

    expect(screen.getByText("クイズの準備完了")).toBeVisible();
    expect(screen.getByText("3問追加しました。")).toBeVisible();
    const link = screen.getByRole("link", { name: /クイズの準備完了/ });
    expect(link).toHaveAttribute("href", "/dashboard?view=study-plans");

    await user.click(link);
    await waitFor(() =>
      expect(markNotificationRead).toHaveBeenCalledWith(notification.uid),
    );
  });
});
