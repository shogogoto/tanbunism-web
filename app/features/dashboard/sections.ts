export const dashboardSections = [
  { id: "timeline", label: "TL" },
  { id: "quiz-timeline", label: "クイズTL" },
  { id: "answers", label: "回答履歴" },
  { id: "study-plans", label: "学習計画" },
  { id: "notes", label: "読書メモ" },
] as const;

export type DashboardSection = (typeof dashboardSections)[number]["id"];

export function isDashboardSection(
  value: string | null,
): value is DashboardSection {
  return dashboardSections.some((section) => section.id === value);
}
