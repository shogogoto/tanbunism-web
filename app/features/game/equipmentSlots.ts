export const equipmentSlots = [
  { id: "arm1", label: "腕1", part: "arm" },
  { id: "arm2", label: "腕2", part: "arm" },
  { id: "body", label: "体", part: "body" },
  { id: "feet", label: "足", part: "feet" },
  { id: "head", label: "頭", part: "head" },
  { id: "accessory1", label: "アクセサリ1", part: "accessory" },
  { id: "accessory2", label: "アクセサリ2", part: "accessory" },
] as const;
export const equipmentParts = [
  { id: "arm", label: "腕" },
  { id: "body", label: "体" },
  { id: "feet", label: "足" },
  { id: "head", label: "頭" },
  { id: "accessory", label: "アクセサリ" },
] as const;
