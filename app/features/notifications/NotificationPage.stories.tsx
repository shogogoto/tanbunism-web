import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { Link, Route, Routes } from "react-router";
import NotificationPage from "./NotificationPage";
import { NotificationProvider } from "./NotificationProvider";
import type { AppNotification } from "./api";

const initial: AppNotification[] = [
  {
    uid: "new",
    kind: "quiz_preparation_complete",
    title: "クイズの準備完了",
    description: "3問追加しました。",
    href: "/dashboard",
    created: "2026-11-03T12:00:00Z",
    read_at: null,
  },
  {
    uid: "old",
    kind: "dungeon_key_granted",
    title: "以前の通知",
    description: "読書メモの開放キーを入手しました。",
    href: "/game/item",
    created: "2026-11-02T12:00:00Z",
    read_at: "2026-11-02T12:30:00Z",
  },
];
let notifications = structuredClone(initial);

export default {
  title: "Notifications/Page",
  component: NotificationPage,
  parameters: {
    reactRouter: { route: "/notifications" },
    msw: {
      handlers: [
        http.get("*/notifications", () =>
          HttpResponse.json({
            notifications,
            unread_count: notifications.filter((item) => !item.read_at).length,
          }),
        ),
        http.post("*/notifications/read-all", () => {
          notifications = notifications.map((item) => ({
            ...item,
            read_at: item.read_at ?? "2026-11-03T12:30:00Z",
          }));
          return HttpResponse.json({ updated_count: 1 });
        }),
        http.get("*/notifications/push/configuration", () =>
          HttpResponse.json({ enabled: false, public_key: null }),
        ),
      ],
    },
  },
  loaders: [
    async () => {
      notifications = structuredClone(initial);
      return {};
    },
  ],
  render: () => (
    <NotificationProvider userId="preview">
      <Routes>
        <Route
          path="/notifications"
          element={
            <>
              <Link to="/other" className="block p-3">
                通知画面を閉じる
              </Link>
              <NotificationPage />
            </>
          }
        />
        <Route
          path="/other"
          element={
            <Link to="/notifications" className="block p-3">
              通知を開く
            </Link>
          }
        />
      </Routes>
    </NotificationProvider>
  ),
} satisfies Meta<typeof NotificationPage>;
export const NewUntilClosed: StoryObj<typeof NotificationPage> = {};
