import { expect, it } from "vitest";
import { sampleCatalog } from "./catalog.fixtures";
import {
  firstAvailableTriggerVariant,
  shopProductId,
  triggerAvailable,
} from "./gambitShop";

it("distinguishes trigger goods from identically named item IDs", () => {
  expect(shopProductId({ item_id: "same", price: 0, enabled: true })).toBe(
    "same",
  );
  expect(shopProductId({ trigger_id: "same", price: 0, enabled: true })).toBe(
    "gambit:same",
  );
});

it("prices variants separately and inherits base access only when not individually sold", () => {
  const catalog = {
    ...sampleCatalog,
    shop: [
      { trigger_id: "hp", price: 10, enabled: true },
      {
        trigger_id: "hp",
        trigger_variant_id: "half",
        price: 20,
        enabled: true,
      },
    ],
  };
  expect(shopProductId(catalog.shop[1])).toBe("gambit:hp:half");
  expect(triggerAvailable(catalog, ["hp"], "hp", "half")).toBe(false);
  expect(triggerAvailable(catalog, ["hp:half"], "hp", "half")).toBe(true);
  expect(triggerAvailable(catalog, ["hp:half"], "hp")).toBe(false);
  expect(triggerAvailable(catalog, [], "hp", "unsold")).toBe(false);
  expect(triggerAvailable(catalog, ["hp"], "hp", "unsold")).toBe(true);
  expect(
    firstAvailableTriggerVariant(catalog, ["hp:half"], {
      id: "hp",
      name: "HP",
      enabled: true,
      condition: "hp_below",
      threshold: 30,
      variants: [{ id: "half", name: "半分", value: 50 }],
    }),
  ).toBe("half");
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
