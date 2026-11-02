export type RewardEntry = {
  item_id: string;
  tier: number;
  weight: number;
  quantity: number;
};
export type RewardTable = {
  id: string;
  name: string;
  base_gold: number;
  gold_per_power: number;
  power_reference: number;
  tier_interval: number;
  draws: number;
  item_chance: number;
  entries: RewardEntry[];
};
export type RewardSettings = {
  tables: RewardTable[];
  chest_table_id: string | null;
};
