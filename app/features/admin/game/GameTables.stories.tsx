import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { defaultBalance } from "~/features/game/battle";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import GameAdminManager from ".";
import type { AdminGameDungeon } from "./api";
import type { GameSettingsDocument } from "./gameSettingsFiles";

const settings: GameSettingsDocument = {
  format: "tanbunism.game-settings",
  version: 1,
  catalog: sampleCatalog,
  balance: defaultBalance,
  battle: { base_seconds: 30 },
};

const dungeons: AdminGameDungeon[] = [
  {
    user_id: "demo",
    user_email: "reader@example.com",
    resource_id: "book",
    resource_name: "復習のための読書メモ",
    status: "path",
    region_count: 2,
    quiz_count: 12,
    regions: [],
  },
];

function Demo() {
  return (
    <Routes>
      <Route path="/admin/game/:subtab" element={<GameAdminManager />} />
    </Routes>
  );
}

export default {
  title: "Admin/GameTables",
  component: Demo,
  parameters: {
    layout: "fullscreen",
    reactRouter: { route: "/admin/game/dungeons" },
    msw: {
      handlers: [
        http.get("*/admin/game/settings-file", () =>
          HttpResponse.json(settings),
        ),
        http.post("*/admin/game/settings-file/preview", async ({ request }) => {
          const { document } = (await request.json()) as {
            document: GameSettingsDocument;
          };
          return HttpResponse.json({
            revision: "fixture",
            backup: settings,
            changes: [],
            document: {
              ...settings,
              catalog: { ...settings.catalog, ...document.catalog },
              balance: { ...settings.balance, ...document.balance },
            },
          });
        }),
        http.put("*/admin/game/settings-file", async ({ request }) => {
          const { document } = (await request.json()) as {
            document: GameSettingsDocument;
          };
          return HttpResponse.json(document);
        }),
        http.get("*/admin/game/dungeons", () => HttpResponse.json(dungeons)),
        http.get("*/admin/game/catalog", () =>
          HttpResponse.json(sampleCatalog),
        ),
        http.put("*/admin/game/catalog", async ({ request }) =>
          HttpResponse.json(await request.json()),
        ),
      ],
    },
  },
} satisfies Meta<typeof Demo>;

export const Dungeons: StoryObj<typeof Demo> = {};
export const SkillUsage: StoryObj<typeof Demo> = {
  parameters: { reactRouter: { route: "/admin/game/usage" } },
};
export const Skills: StoryObj<typeof Demo> = {
  parameters: { reactRouter: { route: "/admin/game/skills" } },
};
export const LegacyItems: StoryObj<typeof Demo> = {
  parameters: { reactRouter: { route: "/admin/game/items" } },
};
