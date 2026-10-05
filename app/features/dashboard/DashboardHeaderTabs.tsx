import SectionHeaderTabs from "~/shared/components/SectionHeaderTabs";
import { dashboardSections } from "./sections";

export default function DashboardHeaderTabs() {
  return (
    <SectionHeaderTabs
      sections={dashboardSections}
      label="ダッシュボードの表示切り替え"
    />
  );
}
