export const dashboardSections = [
  { id: "answers", label: "回答履歴" },
  { id: "study-plans", label: "学習計画" },
  { id: "quiz-management", label: "クイズ管理" },
  { id: "notes", label: "リソース" },
] as const;

export type DashboardSection = (typeof dashboardSections)[number]["id"];

export function isDashboardSection(
  value: string | null,
): value is DashboardSection {
  return dashboardSections.some((section) => section.id === value);
}
