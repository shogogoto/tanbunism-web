import { useCallback, useLayoutEffect, useState } from "react";

export const sidebarCollapsedStorageKey = "tanbunism.sidebar.collapsed";

export default function useSidebarCollapsed() {
  // Keep the server and first client render identical, then restore before paint.
  const [collapsed, setCollapsed] = useState(false);
  useLayoutEffect(() => {
    try {
      setCollapsed(localStorage.getItem(sidebarCollapsedStorageKey) === "true");
    } catch {
      // Storage restrictions must not prevent navigation.
    }
  }, []);
  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(sidebarCollapsedStorageKey, String(next));
    } catch {
      // Keep the control usable even when this preference cannot be saved.
    }
  }, [collapsed]);
  return [collapsed, toggle] as const;
}
