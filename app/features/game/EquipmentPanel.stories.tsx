import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { useState } from "react";
import { SWRConfig } from "swr";
import EquipmentPanel from "./EquipmentPanel";
import { newSave } from "./domain";
import type { GameState } from "./state";

const products = [
  {
    id: "sword",
    name: "銅剣",
    kind: "weapon",
    equipment_part: "arm",
    icon: "sword",
    max_uses: 30,
    skill_name: "物理攻撃力アップ",
  },
  {
    id: "armor",
    name: "革の鎧",
    kind: "weapon",
    equipment_part: "body",
    icon: "shield",
    max_uses: 30,
    skill_name: "守備力アップ",
  },
  {
    id: "boots",
    name: "旅人の靴",
    kind: "weapon",
    equipment_part: "feet",
    icon: "footprints",
    max_uses: 30,
    skill_name: "速さアップ",
  },
];
const initial: GameState = {
  revision: 1,
  save: {
    ...newSave(),
    economy: {
      gold: 100,
      inventory: { sword: 1, armor: 1, boots: 1 },
      weapon: "sword",
      weapon_attack: 3,
      remaining_uses: { sword: 18 },
      equipment: { arm1: { item_id: "sword", max_uses: 30, defensive: false } },
    },
  },
};
let snapshot = structuredClone(initial);
function Preview() {
  const [state, setState] = useState(initial);
  return (
    <SWRConfig value={{ provider: () => new Map() }}>
      <div className="mx-auto max-w-4xl p-4">
        <EquipmentPanel
          userId="preview"
          save={state.save}
          revision={state.revision}
          disabled={false}
          onSaved={setState}
        />
      </div>
    </SWRConfig>
  );
}
export default {
  title: "Game/Equipment",
  component: EquipmentPanel,
  render: () => <Preview />,
  loaders: [
    async () => {
      snapshot = structuredClone(initial);
      return {};
    },
  ],
  parameters: {
    msw: {
      handlers: [
        http.get("*/game/shop", () => HttpResponse.json({ products })),
        http.post("*/game/inventory/equip", async ({ request }) => {
          const body = (await request.json()) as {
            slot: string;
            product_id: string;
          };
          const equipment = snapshot.save.economy?.equipment;
          if (!equipment) throw new Error("Missing equipment");
          const removing = equipment[body.slot]?.item_id === body.product_id;
          for (const slot of Object.keys(equipment))
            if (equipment[slot].item_id === body.product_id)
              delete equipment[slot];
          if (!removing)
            equipment[body.slot] = {
              item_id: body.product_id,
              max_uses: 30,
              defensive: body.slot !== "arm1" && body.slot !== "arm2",
            };
          snapshot.revision++;
          return HttpResponse.json(snapshot);
        }),
      ],
    },
  },
} satisfies Meta<typeof EquipmentPanel>;
export const Default: StoryObj<typeof EquipmentPanel> = {};
