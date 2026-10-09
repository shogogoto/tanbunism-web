import { useAuth } from "~/features/auth/AuthProvider";
import SectionHeaderGroup from "~/shared/components/SectionHeaderGroup";
import SectionHeaderTabs from "~/shared/components/SectionHeaderTabs";
import { useReviewProgress } from "./ReviewProgress";
import ReviewSettingsSelector from "./ReviewSettingsSelector";
import { useReviewTarget } from "./useReviewTarget";
const sections = [
  { id: "knowledge", label: "知識" },
  { id: "quiz", label: "クイズ" },
] as const;
export default function ReviewHeaderTabs() {
  const { user } = useAuth();
  const target = useReviewTarget();
  const knowledge = useReviewProgress(
    "knowledge",
    target.profile,
    target.selectedDay,
  );
  const quiz = useReviewProgress("quiz", target.profile, target.selectedDay);
  const withProgress = sections.map((section) => {
    const progress = section.id === "knowledge" ? knowledge : quiz;
    return {
      ...section,
      progress: progress ? `${progress.done}/${progress.total}` : undefined,
    };
  });
  return (
    <SectionHeaderGroup
      actions={
        user && (
          <fieldset className="min-w-0 max-w-full" aria-label="復習対象と設定">
            <ReviewSettingsSelector
              selected={target.profile}
              onSelect={target.selectPreset}
              recentDays={target.recentDays}
              selectedDay={target.selectedDay}
              onSelectDay={target.selectDay}
            />
          </fieldset>
        )
      }
    >
      <SectionHeaderTabs
        compact
        sections={withProgress}
        label="復習の表示切り替え"
      />
    </SectionHeaderGroup>
  );
}
