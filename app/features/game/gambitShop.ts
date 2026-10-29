import type { GameCatalog, ShopListing, TriggerDefinition } from "./catalog";

export function triggerUnlockId(id: string, variantId?: string | null) {
  return variantId ? `${id}:${variantId}` : id;
}

export function shopProductId(listing: ShopListing) {
  return "item_id" in listing
    ? listing.item_id
    : `gambit:${triggerUnlockId(listing.trigger_id, listing.trigger_variant_id)}`;
}

export function triggerAvailable(
  catalog: GameCatalog,
  unlocked: string[],
  id: string,
  variantId?: string | null,
): boolean {
  const trigger = catalog.triggers?.find((t) => t.id === id && t.enabled);
  return (
    !!trigger &&
    (!variantId || !!trigger.variants?.some((v) => v.id === variantId)) &&
    unlocked.includes(triggerUnlockId(id, variantId))
  );
}

export function firstAvailableTriggerVariant(
  catalog: GameCatalog,
  unlocked: string[],
  trigger: TriggerDefinition,
) {
  if (!trigger.enabled) return undefined;
  if (triggerAvailable(catalog, unlocked, trigger.id)) return null;
  return trigger.variants?.find((v) =>
    triggerAvailable(catalog, unlocked, trigger.id, v.id),
  )?.id;
}
