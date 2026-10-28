import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { defaultBalance } from "~/features/game/battle";
import { sampleCatalog } from "~/features/game/catalog.fixtures";
import GameSettingsFiles from "./GameSettingsFiles";

const original = {
  format: "tanbunism.game-settings",
  version: 1,
  catalog: sampleCatalog,
  balance: defaultBalance,
  battle: { base_seconds: 30 },
};
export default {
  title: "Admin/GameSettingsFiles",
  component: GameSettingsFiles,
  args: { onApplied: () => undefined },
  parameters: {
    msw: {
      handlers: [
        http.get("*/admin/game/settings-file", () =>
          HttpResponse.json(original),
        ),
        http.post("*/admin/game/settings-file/preview", async ({ request }) => {
          const { document } = (await request.json()) as {
            document: { balance?: Record<string, unknown> };
          };
          const next = {
            ...original,
            balance: { ...original.balance, ...document.balance },
          };
          return HttpResponse.json({
            revision: "fixture-revision",
            backup: original,
            document: next,
            changes: Object.entries(document.balance ?? {}).map(
              ([key, value]) => ({
                section: `balance.${key}`,
                before: original.balance[key as keyof typeof defaultBalance],
                after: value,
              }),
            ),
          });
        }),
        http.put("*/admin/game/settings-file", () =>
          HttpResponse.json(original),
        ),
      ],
    },
  },
} satisfies Meta<typeof GameSettingsFiles>;
export const Default: StoryObj<typeof GameSettingsFiles> = {};
