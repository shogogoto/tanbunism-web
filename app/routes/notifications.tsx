import AuthGuard from "~/features/auth/AuthGuard";
import NotificationPage from "~/features/notifications/NotificationPage";

export function meta() {
  return [
    { title: "通知 | Tanbunism" },
    { name: "description", content: "通知履歴とプッシュ通知設定" },
  ];
}

export default function NotificationsRoute() {
  return (
    <AuthGuard>
      <NotificationPage />
    </AuthGuard>
  );
}
