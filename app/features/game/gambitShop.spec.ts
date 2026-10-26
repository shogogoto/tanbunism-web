import { expect, it } from "vitest";
import { sampleCatalog } from "./catalog.fixtures";
import { shopProductId, triggerAvailable } from "./gambitShop";

it("distinguishes trigger goods from identically named item IDs", () => {
  expect(shopProductId({ item_id: "same", price: 0, enabled: true })).toBe(
    "same",
  );
  expect(shopProductId({ trigger_id: "same", price: 0, enabled: true })).toBe(
    "gambit:same",
  );
});

it("requires purchase for sale-configured triggers while retaining existing free triggers", () => {
  const catalog = {
    ...sampleCatalog,
    shop: [{ trigger_id: "paid", price: 10, enabled: true }],
  };
  expect(triggerAvailable(catalog, [], "paid")).toBe(false);
  expect(triggerAvailable(catalog, ["paid"], "paid")).toBe(true);
  expect(triggerAvailable(catalog, [], "free")).toBe(true);
  catalog.shop[0].enabled = false;
  expect(triggerAvailable(catalog, [], "paid")).toBe(false);
});
