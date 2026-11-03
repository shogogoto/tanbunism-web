import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBadge } from "./NotificationBadge";
import NotificationPage from "./NotificationPage";
import { NotificationProvider } from "./NotificationProvider";
import {
  getPushConfiguration,
  listNotifications,
  markAllNotificationsRead,
} from "./api";
import { notifyNotificationsChanged } from "./events";

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

describe("NotificationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listNotifications).mockResolvedValue({
      notifications: [notification],
      unread_count: 1,
    });
    vi.mocked(getPushConfiguration).mockResolvedValue({
      enabled: false,
      public_key: null,
    });
    vi.mocked(markAllNotificationsRead).mockResolvedValue({ updated_count: 1 });
  });

  afterEach(() => vi.useRealTimers());

  it("keeps new highlights after read updates and polling, including new arrivals, until leaving the page", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    let feed = {
      notifications: [
        notification,
        {
          ...notification,
          uid: "old",
          title: "以前の通知",
          read_at: "2026-09-28T12:00:00Z",
        },
      ],
      unread_count: 1,
    };
    vi.mocked(listNotifications).mockImplementation(async () => feed);
    vi.mocked(markAllNotificationsRead).mockImplementation(async () => {
      feed = {
        notifications: feed.notifications.map((item) => ({
          ...item,
          read_at: item.read_at ?? "2026-09-29T13:00:00Z",
        })),
        unread_count: 0,
      };
      return { updated_count: 1 };
    });
    render(
      <MemoryRouter initialEntries={["/notifications"]}>
        <NotificationProvider userId="user-1">
          <NotificationBadge />
          <Routes>
            <Route
              path="/notifications"
              element={
                <>
                  <Link to="/other">画面を閉じる</Link>
                  <NotificationPage />
                </>
              }
            />
            <Route
              path="/other"
              element={<Link to="/notifications">通知に戻る</Link>}
            />
          </Routes>
        </NotificationProvider>
      </MemoryRouter>,
    );
    const first = await screen.findByRole("link", { name: /クイズの準備完了/ });
    await waitFor(() =>
      expect(markAllNotificationsRead).toHaveBeenCalledOnce(),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText("未読1件")).not.toBeInTheDocument(),
    );
    expect(first).toHaveClass("bg-accent/40");
    expect(screen.getByRole("link", { name: /以前の通知/ })).not.toHaveClass(
      "bg-accent/40",
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120000);
    });
    expect(first).toHaveClass("bg-accent/40");
    feed = {
      notifications: [
        { ...notification, uid: "arrived", title: "表示中に届いた通知" },
        ...feed.notifications,
      ],
      unread_count: 1,
    };
    act(() => notifyNotificationsChanged());
    const arrived = await screen.findByRole("link", {
      name: /表示中に届いた通知/,
    });
    await waitFor(() =>
      expect(markAllNotificationsRead).toHaveBeenCalledTimes(2),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(first).toHaveClass("bg-accent/40");
    expect(arrived).toHaveClass("bg-accent/40");
    fireEvent.click(screen.getByRole("link", { name: "画面を閉じる" }));
    fireEvent.click(screen.getByRole("link", { name: "通知に戻る" }));
    expect(
      await screen.findByRole("link", { name: /クイズの準備完了/ }),
    ).not.toHaveClass("bg-accent/40");
    expect(
      screen.getByRole("link", { name: /表示中に届いた通知/ }),
    ).not.toHaveClass("bg-accent/40");
  });

  it("DB通知を一覧表示した時点ですべて既読にする", async () => {
    render(
      <MemoryRouter>
        <NotificationProvider userId="user-1">
          <NotificationPage />
        </NotificationProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("クイズの準備完了")).toBeVisible();
    expect(screen.getByText("3問追加しました。")).toBeVisible();
    const link = screen.getByRole("link", { name: /クイズの準備完了/ });
    expect(link).toHaveAttribute("href", "/dashboard?view=study-plans");

    await waitFor(() =>
      expect(markAllNotificationsRead).toHaveBeenCalledOnce(),
    );
  });

  it("import完了の更新通知ですぐに開放キーの通知を取得し、所持品へのリンクを表示する", async () => {
    vi.mocked(listNotifications).mockResolvedValue({
      notifications: [],
      unread_count: 0,
    });
    render(
      <MemoryRouter>
        <NotificationProvider userId="user-1">
          <NotificationPage />
        </NotificationProvider>
      </MemoryRouter>,
    );
    await screen.findByText("通知はありません");
    vi.mocked(listNotifications).mockResolvedValue({
      notifications: [
        {
          ...notification,
          kind: "dungeon_key_granted",
          title: "ダンジョン開放キーを入手しました",
          description: "読書メモの開放キーを1個入手しました。",
          href: "/game/item",
        },
      ],
      unread_count: 1,
    });
    act(() => notifyNotificationsChanged());
    expect(
      await screen.findByRole("link", {
        name: /ダンジョン開放キーを入手しました/,
      }),
    ).toHaveAttribute("href", "/game/item");
    expect(
      screen.getByText("読書メモの開放キーを1個入手しました。"),
    ).toBeVisible();
  });
});
