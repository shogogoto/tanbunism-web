export type RewardEntry = {
  item_id: string;
  tier: number;
  weight: number;
  quantity: number;
};
export type RewardTable = {
  id: string;
  name: string;
  tier_interval: number;
  draws: number;
  item_chance: number;
  entries: RewardEntry[];
};
export type GoldSettings = {
  base: number;
  power_coefficient: number;
  power_formula: "sqrt" | "log";
  power_reference: number;
  achievement_growth_percent: number;
  variance_percent: number;
  enemy_multiplier: number;
  chest_multiplier: number;
};
export const defaultGoldSettings: GoldSettings = {
  base: 10,
  power_coefficient: 2,
  power_formula: "sqrt",
  power_reference: 100,
  achievement_growth_percent: 20,
  variance_percent: 10,
  enemy_multiplier: 1,
  chest_multiplier: 5,
};
export type RewardSettings = {
  gold?: GoldSettings;
  tables: RewardTable[];
  chest_table_id: string | null;
};
