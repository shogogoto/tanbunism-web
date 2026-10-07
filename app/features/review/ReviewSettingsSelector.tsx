import { useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "~/features/auth/AuthProvider";
import {
  defaultSettings,
  presetStorageKey,
  useReviewSettings,
} from "./settings";
import { useReviewPlans } from "./useReviewPlans";

export default function ReviewSettingsSelector({
  selected,
  onSelect,
}: { selected: string; onSelect: (id: string) => void }) {
  const { user } = useAuth();
  const { data, error } = useReviewSettings();
  const { data: plans, error: plansError } = useReviewPlans();
  useEffect(() => {
    if (
      !selected.startsWith("plan:") &&
      data &&
      !data.some((setting) => setting.id === selected)
    )
      onSelect("default");
  }, [data, selected, onSelect]);
  useEffect(() => {
    if (!user || selected.startsWith("plan:")) return;
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
        復習対象
        <select
          aria-label="復習設定を切り替え"
          className="h-8 min-w-0 max-w-60 rounded border bg-background px-2"
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
        >
          <optgroup label="今日・自作設定">
            {(
              data ?? [
                defaultSettings,
                ...(selected !== "default" && !selected.startsWith("plan:")
                  ? [{ id: selected, name: "読み込み中…" }]
                  : []),
              ]
            ).map((setting) => (
              <option key={setting.id} value={setting.id}>
                {setting.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="StudyPlan（リソース別）">
            {plans?.map((plan) => (
              <option key={plan.uid} value={`plan:${plan.uid}`}>
                {plan.name}
              </option>
            ))}
            {selected.startsWith("plan:") &&
              !plans?.some((plan) => `plan:${plan.uid}` === selected) && (
                <option value={selected}>
                  {plansError ? "計画を取得できません" : "計画を読み込み中…"}
                </option>
              )}
          </optgroup>
        </select>
      </label>
      <Link
        to={
          selected.startsWith("plan:")
            ? "/dashboard?view=study-plans"
            : "/dashboard?view=review-settings"
        }
        className="ml-auto shrink-0 text-muted-foreground hover:underline"
      >
        {selected.startsWith("plan:") ? "学習計画を管理" : "設定を管理"}
      </Link>
      {(error || plansError) && (
        <span role="alert" className="text-xs text-destructive">
          設定一覧の取得に失敗
        </span>
      )}
    </div>
  );
}
