import { useAuth } from "~/features/auth/AuthProvider";
import SectionHeaderTabs from "~/shared/components/SectionHeaderTabs";
import ReviewSettingsSelector from "./ReviewSettingsSelector";
import { useReviewTarget } from "./useReviewTarget";
const sections = [
  { id: "knowledge", label: "知識" },
  { id: "quiz", label: "クイズ" },
] as const;
export default function ReviewHeaderTabs() {
  const { user } = useAuth();
  const target = useReviewTarget();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-2 px-2">
      <div className="min-w-0 shrink-0">
        <SectionHeaderTabs sections={sections} label="復習の表示切り替え" />
      </div>
      {user && (
        <fieldset
          className="ml-auto min-w-0 max-w-full"
          aria-label="復習対象と設定"
        >
          <ReviewSettingsSelector
            selected={target.profile}
            onSelect={target.selectPreset}
            recentDays={target.recentDays}
            selectedDay={target.selectedDay}
            onSelectDay={target.selectDay}
          />
        </fieldset>
      )}
    </div>
  );
}
