export const itemCategories = [
  { id: "weapon", label: "武器" },
  { id: "armor", label: "防具" },
  { id: "recovery", label: "回復" },
  { id: "unlock_key", label: "開放キー" },
  { id: "other", label: "その他" },
] as const;

export type ItemCategory = (typeof itemCategories)[number]["id"];

// 旧APIの応答でも表示できるようにする。明示したカテゴリを最優先する。
export function itemCategory(product: {
  category?: ItemCategory;
  kind: string;
}): ItemCategory {
  if (product.category) return product.category;
  if (product.kind === "weapon") return "weapon";
  if (product.kind === "dungeon_unlock") return "unlock_key";
  if (["hp", "mp", "moves"].includes(product.kind)) return "recovery";
  return "other";
}
