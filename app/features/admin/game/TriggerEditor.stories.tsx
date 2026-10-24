import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
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
            triggers: [
              {
                id: "hp",
                name: "HPが少ない",
                condition: "hp_below",
                threshold: 30,
                enabled: true,
              },
              {
                id: "buff",
                name: "バフなし",
                condition: "buff_absent",
                threshold: 30,
                enabled: true,
              },
              {
                id: "poison",
                name: "毒状態",
                condition: "poisoned",
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
