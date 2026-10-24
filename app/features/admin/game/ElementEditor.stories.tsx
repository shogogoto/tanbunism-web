import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { defaultElements } from "~/features/game/catalog";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import ElementEditor from "./ElementEditor";

export default {
  title: "Admin/Elements",
  component: ElementEditor,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("*/admin/game/catalog", () =>
          HttpResponse.json({ ...sampleCatalog, elements: defaultElements }),
        ),
        http.put("*/admin/game/catalog", async ({ request }) =>
          HttpResponse.json(await request.json()),
        ),
      ],
    },
  },
} satisfies Meta<typeof ElementEditor>;
export const Default: StoryObj<typeof ElementEditor> = {};
