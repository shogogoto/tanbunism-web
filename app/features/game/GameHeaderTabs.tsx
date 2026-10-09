import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import SectionHeaderTabs from "~/shared/components/SectionHeaderTabs";
import { useAdventureAccess } from "./access";

const sections = [
  { id: "adventure", label: "冒険" },
  { id: "status", label: "ステータス" },
  { id: "item", label: "アイテム" },
] as const;

export default function GameHeaderTabs() {
  const { user } = useAuth();
  const access = useAdventureAccess(user?.uid);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (!user) return null;
  const data = access.data;
  const remainingMinutes = data
    ? Math.max(
        0,
        Math.ceil(
          (data.next_available_at -
            data.server_now -
            Math.max(0, now - data.receivedAt)) /
            60_000,
        ),
      )
    : 0;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-2 px-2 sm:px-3">
      <div className="min-w-0 shrink-0">
        <SectionHeaderTabs
          compact
          sections={sections}
          label="ゲームメニュー"
          active={pathname.split("/")[2] || "adventure"}
          onSelect={(id) => void navigate(`/game/${id}`)}
        />
      </div>
      <span
        className="ml-auto py-2 text-xs text-muted-foreground tabular-nums"
        title="冒険権は毎時00分・30分に回復します。"
      >
        {access.error
          ? "冒険権を確認できません"
          : data?.available
            ? "冒険可能"
            : data
              ? `次の冒険まで ${remainingMinutes}分`
              : "冒険権を確認中"}
      </span>
    </div>
  );
}
