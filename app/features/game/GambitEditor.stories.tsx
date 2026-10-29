import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import GambitEditor from "./GambitEditor";
import { sampleCatalog } from "./catalog.fixtures";
import { newSave } from "./domain";

const catalog = {
  ...sampleCatalog,
  triggers: [
    {
      id: "hp",
      name: "HPの少ない味方",
      condition: "hp_below",
      threshold: 30,
      target: "ally",
      enabled: true,
      variant_field: "threshold",
      variants: [
        { id: "half", name: "50%未満", value: 50 },
        { id: "low", name: "10%未満", value: 10 },
      ],
    },
    {
      id: "always",
      name: "敵：いつでも",
      condition: "always",
      threshold: 30,
      target: "enemy",
      enabled: true,
    },
    {
      id: "unowned",
      name: "未入手のトリガー",
      condition: "always",
      threshold: 30,
      target: "enemy",
      enabled: true,
    },
  ],
};
const economy = {
  gold: 100,
  inventory: { healing_potion: 2 },
  weapon: null,
  weapon_attack: 0,
  unlocked_triggers: ["hp", "hp:half", "always"],
};

const meta = {
  title: "Game/Gambits",
  component: GambitEditor,
  decorators: [
    (Story) => (
      <SWRConfig value={{ provider: () => new Map() }}>
        <div className="mx-auto max-w-lg p-4">
          <Story />
        </div>
      </SWRConfig>
    ),
  ],
  parameters: {
    msw: {
      handlers: [
        http.get("*/game/gambits/capacity", () =>
          HttpResponse.json({ slots: 2, next_level: 10 }),
        ),
        http.get("*/game/catalog", () => HttpResponse.json(catalog)),
        http.put("*/game/gambits", async ({ request }) => {
          const { rules } = (await request.json()) as { rules: unknown[] };
          return HttpResponse.json({
            revision: 1,
            save: { ...newSave(), gambits: rules },
          });
        }),
      ],
    },
  },
} satisfies Meta<typeof GambitEditor>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Priorities: Story = {
  args: {
    save: {
      ...newSave(),
      economy,
      gambits: [
        {
          enabled: true,
          condition: "hp_below",
          trigger_id: "hp",
          threshold: 30,
          action: "skill",
          definition_id: "heal",
        },
        {
          enabled: true,
          condition: "always",
          trigger_id: "always",
          threshold: 30,
          action: "skill",
          definition_id: "fire",
        },
      ],
    },
    revision: 0,
    onSaved: () => undefined,
  },
};

export const NoTriggers: Story = {
  args: {
    ...Priorities.args,
    save: { ...newSave(), economy: { ...economy, unlocked_triggers: [] } },
  },
};

export const OwnedVariant: Story = {
  args: {
    ...Priorities.args,
    save: {
      ...newSave(),
      economy: { ...economy, unlocked_triggers: ["hp:half"] },
    },
  },
};
