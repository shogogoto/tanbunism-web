import { gameRequest } from "./battle";
import type { DungeonMap } from "./exploration";
import { PLACES_PER_REGION } from "./exploration";
import type { GameState } from "./state";

export type ChestReward = {
  gold: number;
  healing_potion: number;
  step_potion: number;
  items?: Record<string, { name: string; quantity: number }>;
};
export const chestId = (region: number) => `@chest:${region}`;
export function chestRegion(id: string): number | undefined {
  if (!/^@chest:\d+$/.test(id)) return undefined;
  return Number(id.slice(7));
}
export function regionChests(map: DungeonMap) {
  const regions = new Map<number, string[]>();
  for (const place of map.places) {
    const places = regions.get(place.region) ?? [];
    places.push(place.id);
    regions.set(place.region, places);
  }
  return [...regions].flatMap(([region, places]) =>
    places.length >= PLACES_PER_REGION
      ? [
          {
            id: chestId(region),
            region,
            last: places[places.length - 1],
            count: places.length,
          },
        ]
      : [],
  );
}
export function chestMessage(reward: ChestReward) {
  const items = new Map(
    Object.entries(reward.items ?? {}).map(([id, item]) => [id, { ...item }]),
  );
  for (const [id, name, quantity] of [
    ["healing_potion", "回復薬", reward.healing_potion],
    ["step_potion", "歩数回復薬", reward.step_potion],
  ] as const) {
    if (!quantity) continue;
    const previous = items.get(id);
    items.set(id, {
      name: previous?.name ?? name,
      quantity: (previous?.quantity ?? 0) + quantity,
    });
  }
  const contents = [
    reward.gold && `${reward.gold} G`,
    ...[...items.values()].map((item) => `${item.name} ×${item.quantity}`),
  ]
    .filter(Boolean)
    .join("、");
  return contents ? `${contents} が入っていた。` : "中は空だった。";
}
export const openChest = (revision: number, region: number) =>
  gameRequest<GameState>("chests/open", { revision, region });
