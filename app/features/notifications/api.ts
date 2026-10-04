const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export type AppNotification = {
  uid: string;
  kind:
    | "quiz_preparation_complete"
    | "quiz_preparation_failed"
    | "quiz_issue_reported";
  title: string;
  description: string | null;
  href: string | null;
  created: string;
  read_at: string | null;
};

export type NotificationFeed = {
  notifications: AppNotification[];
  unread_count: number;
};

type PushConfiguration = {
  enabled: boolean;
  public_key: string | null;
};

export function listNotifications(signal?: AbortSignal) {
  return request<NotificationFeed>("/notifications", { signal });
}

export function markNotificationRead(notificationId: string) {
  return request<AppNotification>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "POST" },
  );
}

export function markAllNotificationsRead() {
  return request<{ updated_count: number }>("/notifications/read-all", {
    method: "POST",
  });
}

export function getPushConfiguration() {
  return request<PushConfiguration>("/notifications/push/configuration");
}

export function savePushSubscription(subscription: PushSubscriptionJSON) {
  return request<void>("/notifications/push/subscriptions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
}

export function deletePushSubscription(endpoint: string) {
  return request<void>("/notifications/push/subscriptions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`通知APIへの接続に失敗しました (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
