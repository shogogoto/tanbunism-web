export const gameMenuTabs = [
  ["status", "ステータス"],
  ["item", "アイテム"],
  ["gambits", "ガンビット"],
  ["specialties", "専門分野"],
] as const;

export function isGamePanel(value: string | undefined) {
  return gameMenuTabs.some(([tab]) => tab === value) || value === "boss";
}
