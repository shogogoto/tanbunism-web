export const gameMenuTabs = [
  ["status", "ステータス"],
  ["item", "アイテム"],
  ["equipment", "装備"],
  ["gambits", "ガンビット"],
  ["specialties", "専門分野"],
  ["library", "旅人の書庫"],
  ["achievements", "実績"],
] as const;

export function isGamePanel(value: string | undefined) {
  return (
    gameMenuTabs.some(([tab]) => tab === value) ||
    value === "shop" ||
    value === "boss"
  );
}
