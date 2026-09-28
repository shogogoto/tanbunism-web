export const dashboardSections = [
  { id: "start", label: "はじめる" },
  { id: "activity", label: "活動" },
  { id: "achievement", label: "今月" },
  { id: "answers", label: "最近の回答" },
  { id: "notes", label: "読書メモ" },
] as const;

export type DashboardSection = (typeof dashboardSections)[number]["id"];

export function isDashboardSection(
  value: string | null,
): value is DashboardSection {
  return dashboardSections.some((section) => section.id === value);
}
