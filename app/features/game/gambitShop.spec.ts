import { expect, it } from "vitest";
import { sampleCatalog } from "./catalog.fixtures";
import {
  firstAvailableTriggerVariant,
  shopProductId,
  triggerAvailable,
} from "./gambitShop";

const catalog = {
  ...sampleCatalog,
  triggers: [
    {
      id: "hp",
      name: "HP",
      condition: "hp_below" as const,
      threshold: 30,
      enabled: true,
      variants: [
        { id: "half", name: "半分", value: 50 },
        { id: "low", name: "瀕死", value: 10 },
      ],
    },
  ],
};

it("distinguishes trigger products from item IDs", () => {
  expect(shopProductId({ item_id: "same", price: 0, enabled: true })).toBe(
    "same",
  );
  expect(shopProductId({ trigger_id: "same", price: 0, enabled: true })).toBe(
    "gambit:same",
  );
});
it("requires exact ownership independent of shop listings", () => {
  expect(triggerAvailable(catalog, [], "hp")).toBe(false);
  expect(triggerAvailable(catalog, ["hp"], "hp")).toBe(true);
  expect(triggerAvailable(catalog, ["hp"], "hp", "half")).toBe(false);
  expect(triggerAvailable(catalog, ["hp:half"], "hp", "half")).toBe(true);
  expect(triggerAvailable(catalog, ["hp:half"], "hp")).toBe(false);
  expect(triggerAvailable(catalog, ["hp:half"], "hp", "low")).toBe(false);
  expect(
    firstAvailableTriggerVariant(catalog, ["hp:half"], catalog.triggers[0]),
  ).toBe("half");
});
it("does not grant missing or disabled definitions even when owned", () => {
  expect(triggerAvailable(catalog, ["missing"], "missing")).toBe(false);
  expect(triggerAvailable(catalog, ["hp:missing"], "hp", "missing")).toBe(
    false,
  );
  expect(
    triggerAvailable(
      { ...catalog, triggers: [{ ...catalog.triggers[0], enabled: false }] },
      ["hp"],
      "hp",
    ),
  ).toBe(false);
});
