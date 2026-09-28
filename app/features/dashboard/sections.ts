export const dashboardSections = [
  { id: "profile", label: "プロフィール" },
  { id: "answers", label: "回答履歴" },
  { id: "notes", label: "読書メモ" },
  { id: "study-plans", label: "学習計画" },
] as const;

export type DashboardSection = (typeof dashboardSections)[number]["id"];

export function isDashboardSection(
  value: string | null,
): value is DashboardSection {
  return dashboardSections.some((section) => section.id === value);
}
