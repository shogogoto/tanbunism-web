import type { GameCatalog, ShopListing } from "./catalog";

export function shopProductId(listing: ShopListing) {
  return "item_id" in listing
    ? listing.item_id
    : `gambit:${listing.trigger_id}`;
}

export function triggerAvailable(
  catalog: GameCatalog,
  unlocked: string[],
  id: string,
) {
  return (
    unlocked.includes(id) ||
    !catalog.shop?.some((row) => "trigger_id" in row && row.trigger_id === id)
  );
}
