import SectionHeaderTabs from "~/shared/components/SectionHeaderTabs";
const sections = [
  { id: "knowledge", label: "知識" },
  { id: "quiz", label: "クイズ" },
] as const;
export default function ReviewHeaderTabs() {
  return <SectionHeaderTabs sections={sections} label="復習の表示切り替え" />;
}
