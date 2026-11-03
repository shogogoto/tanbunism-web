import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { defaultBalance } from "~/features/game/battle";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import type { GoldSettings, RewardSettings } from "~/features/game/rewards";
import RewardsEditor from "./RewardsEditor";
import type { GameSettingsDocument } from "./gameSettingsFiles";

const rewards: RewardSettings = {
  chest_table_id: "treasure",
  tables: [
    {
      id: "treasure",
      name: "領域の宝箱",
      tier_interval: 5,
      draws: 1,
      item_chance: 100,
      entries: [
        { item_id: "healing_potion", tier: 1, weight: 2, quantity: 1 },
        { item_id: "training_sword", tier: 1, weight: 1, quantity: 1 },
        { item_id: "training_shield", tier: 2, weight: 1, quantity: 1 },
        { item_id: "training_shield", tier: 3, weight: 1, quantity: 2 },
      ],
    },
  ],
};
const original: GameSettingsDocument = {
  format: "tanbunism.game-settings",
  version: 1,
  catalog: {
    ...sampleCatalog,
    rewards,
    items: [
      ...sampleCatalog.items,
      { ...sampleCatalog.items[0], id: "training_sword", name: "練習用の剣" },
      { ...sampleCatalog.items[0], id: "training_shield", name: "練習用の盾" },
    ],
  },
  balance: defaultBalance,
  battle: { base_seconds: 30 },
};
export default {
  title: "Admin/Rewards",
  component: RewardsEditor,
  parameters: {
    msw: {
      handlers: [
        http.post("*/admin/game/rewards/gold-preview", async ({ request }) => {
          const { settings, power, achievement } = (await request.json()) as {
            settings: GoldSettings;
            power: number;
            achievement: number;
          };
          const bonus =
            settings.power_formula === "sqrt"
              ? Math.sqrt(power / settings.power_reference)
              : Math.log1p(power / settings.power_reference);
          const amount =
            (settings.base + bonus * settings.power_coefficient) *
            (1 +
              (Math.max(0, achievement - 1) *
                settings.achievement_growth_percent) /
                100);
          return HttpResponse.json(
            Object.fromEntries(
              (["enemy", "chest"] as const).map((source) => [
                source,
                Object.fromEntries(
                  [
                    ["min", -1],
                    ["typical", 0],
                    ["max", 1],
                  ].map(([key, variation]) => [
                    key,
                    Math.min(
                      1000000,
                      Math.floor(
                        amount *
                          settings[`${source}_multiplier`] *
                          (1 +
                            (Number(variation) * settings.variance_percent) /
                              100),
                      ),
                    ),
                  ]),
                ),
              ]),
            ),
          );
        }),
        http.get("*/admin/game/settings-file", () =>
          HttpResponse.json(original),
        ),
        http.post("*/admin/game/settings-file/preview", async ({ request }) => {
          const { document } = (await request.json()) as {
            document: GameSettingsDocument;
          };
          return HttpResponse.json({
            revision: "fixture-revision",
            backup: original,
            changes: [],
            document: {
              ...original,
              catalog: { ...original.catalog, ...document.catalog },
              balance: { ...original.balance, ...document.balance },
            },
          });
        }),
        http.put("*/admin/game/settings-file", async ({ request }) => {
          const { document } = (await request.json()) as {
            document: GameSettingsDocument;
          };
          return HttpResponse.json(document);
        }),
      ],
    },
  },
} satisfies Meta<typeof RewardsEditor>;
export const Default: StoryObj<typeof RewardsEditor> = {};
