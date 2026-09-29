import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type AppNotification,
  deletePushSubscription,
  getPushConfiguration,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
} from "./api";

export type PushState =
  | "checking"
  | "available"
  | "subscribed"
  | "denied"
  | "unsupported"
  | "unavailable";

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  pushState: PushState;
  refreshNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  enablePush: () => Promise<boolean>;
  disablePush: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);
const REFRESH_INTERVAL_MS = 60_000;

export function NotificationProvider({
  userId,
  children,
}: PropsWithChildren<{ userId?: string }>) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushState, setPushState] = useState<PushState>("checking");

  const applyFeed = useCallback(
    (feed: Awaited<ReturnType<typeof listNotifications>>) => {
      setNotifications(feed.notifications);
      setUnreadCount(feed.unread_count);
      updateAppBadge(feed.unread_count);
    },
    [],
  );

  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      applyFeed(await listNotifications());
    } catch (error) {
      console.error("Failed to refresh notifications", error);
    }
  }, [applyFeed, userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setPushState("checking");
      updateAppBadge(0);
      return;
    }
    const controller = new AbortController();
    void listNotifications(controller.signal)
      .then(applyFeed)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Failed to load notifications", error);
        }
      });
    void inspectPushState();

    const refresh = () => void refreshNotifications();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, [applyFeed, refreshNotifications, userId]);

  async function inspectPushState() {
    if (!supportsWebPush()) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }
    try {
      const configuration = await getPushConfiguration();
      if (!configuration.enabled || !configuration.public_key) {
        setPushState("unavailable");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await savePushSubscription(subscription.toJSON());
        setPushState("subscribed");
      } else {
        setPushState("available");
      }
    } catch (error) {
      console.error("Failed to inspect Web Push", error);
      setPushState("unavailable");
    }
  }

  const enablePush = useCallback(async () => {
    if (!supportsWebPush()) {
      setPushState("unsupported");
      return false;
    }
    const configuration = await getPushConfiguration();
    if (!configuration.enabled || !configuration.public_key) {
      setPushState("unavailable");
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushState(permission === "denied" ? "denied" : "available");
      return false;
    }
    const registration = await navigator.serviceWorker.register("/sw.js");
    const current = await registration.pushManager.getSubscription();
    const subscription =
      current ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(configuration.public_key),
      }));
    await savePushSubscription(subscription.toJSON());
    setPushState("subscribed");
    return true;
  }, []);

  const disablePush = useCallback(async () => {
    if (!supportsWebPush()) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await deletePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setPushState("available");
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      await markNotificationRead(id);
      await refreshNotifications();
    },
    [refreshNotifications],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read_at: notification.read_at ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
    updateAppBadge(0);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const notificationId = new URL(window.location.href).searchParams.get(
      "notification",
    );
    if (!notificationId) return;
    void markRead(notificationId).finally(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("notification");
      window.history.replaceState(window.history.state, "", url);
    });
  }, [markRead, userId]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      pushState,
      refreshNotifications,
      markRead,
      markAllRead,
      enablePush,
      disablePush,
    }),
    [
      disablePush,
      enablePush,
      markAllRead,
      markRead,
      notifications,
      pushState,
      refreshNotifications,
      unreadCount,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  }
  return context;
}

function supportsWebPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function updateAppBadge(count: number) {
  if (typeof navigator === "undefined") return;
  if (count > 0 && "setAppBadge" in navigator) {
    void navigator.setAppBadge(count);
  } else if (count === 0 && "clearAppBadge" in navigator) {
    void navigator.clearAppBadge();
  }
}
