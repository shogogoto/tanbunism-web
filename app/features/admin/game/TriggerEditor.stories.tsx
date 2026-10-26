import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { normalizeSkill } from "~/features/game/catalog";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import TriggerEditor from "./TriggerEditor";

export default {
  title: "Admin/TriggerEditor",
  component: TriggerEditor,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("*/admin/game/catalog", () =>
          HttpResponse.json({
            ...sampleCatalog,
            skills: [
              ...sampleCatalog.skills,
              normalizeSkill({
                id: "curse_skill",
                name: "カース",
                icon: "skull",
                effect: "ailment",
                target: "enemy",
                ailment: "curse",
                amount: 3,
                mp_cost: 2,
                enabled: true,
              }),
              normalizeSkill({
                id: "defense_up",
                name: "プロテクト",
                icon: "shield",
                effect: "buff",
                target: "self",
                stat: "defense",
                amount: 5,
                mp_cost: 2,
                enabled: true,
              }),
            ],
            triggers: [
              {
                id: "hp",
                name: "HPが少ない",
                target: "ally",
                variant_field: "threshold",
                variants: [
                  { id: "half", name: "半分", value: 50 },
                  { id: "low", name: "瀕死", value: 20 },
                ],
                condition: "hp_below",
                threshold: 30,
                enabled: true,
              },
              {
                id: "buff",
                name: "バフなし",
                condition: "state",
                state_skill_id: "defense_up",
                state_present: false,
                target: "self",
                threshold: 30,
                enabled: true,
              },
              {
                id: "poison",
                name: "呪い状態",
                condition: "state",
                state_skill_id: "curse_skill",
                state_present: true,
                target: "enemy",
                threshold: 30,
                enabled: true,
              },
            ],
          }),
        ),
        http.put("*/admin/game/catalog", async ({ request }) =>
          HttpResponse.json(await request.json()),
        ),
      ],
    },
  },
} satisfies Meta<typeof TriggerEditor>;

export const Default: StoryObj<typeof TriggerEditor> = {};
