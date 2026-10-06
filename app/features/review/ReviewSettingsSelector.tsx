import { useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import {
  defaultSettings,
  presetStorageKey,
  useReviewSettings,
} from "./settings";

export default function ReviewSettingsSelector({
  selected,
  onSelect,
}: { selected: string; onSelect: (id: string) => void }) {
  const { user } = useAuth();
  const { data, error } = useReviewSettings();
  useEffect(() => {
    if (data && !data.some((setting) => setting.id === selected))
      onSelect("default");
  }, [data, selected, onSelect]);
  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(presetStorageKey(user.uid), selected);
    } catch {
      /* 保存不可でも復習は継続できる */
    }
  }, [user, selected]);
  return (
    <div
      className="mx-auto mb-3 flex max-w-3xl items-center gap-2 text-sm"
      data-dashboard-swipe-ignore
    >
      <label className="flex min-w-0 items-center gap-2">
        今日の設定
        <select
          aria-label="復習設定を切り替え"
          className="h-8 min-w-0 max-w-60 rounded border bg-background px-2"
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
        >
          {(
            data ?? [
              defaultSettings,
              ...(selected !== "default"
                ? [{ id: selected, name: "読み込み中…" }]
                : []),
            ]
          ).map((setting) => (
            <option key={setting.id} value={setting.id}>
              {setting.name}
            </option>
          ))}
        </select>
      </label>
      <Link
        to="/dashboard?view=review-settings"
        className="ml-auto shrink-0 text-muted-foreground hover:underline"
      >
        設定を管理
      </Link>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          設定一覧の取得に失敗
        </span>
      )}
    </div>
  );
}
