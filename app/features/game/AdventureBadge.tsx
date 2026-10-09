import { useAuth } from "~/features/auth/AuthProvider";
import { useAdventureAccess } from "./access";

export function AdventureBadge() {
  const { user, isAuthenticated } = useAuth();
  const { data, error } = useAdventureAccess(
    isAuthenticated ? user?.uid : undefined,
  );
  if (!isAuthenticated || !data?.available || error) return null;

  return (
    <span
      role="status"
      aria-label="冒険可能"
      title="冒険可能"
      className="absolute -right-1 -top-1 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background"
    />
  );
}
