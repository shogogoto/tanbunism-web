import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { SWRConfig } from "swr";
import PublicDungeons from "./PublicDungeons";

let joined = false;
export default {
  title: "Game/PublicDungeons",
  component: PublicDungeons,
  loaders: [
    async () => {
      joined = false;
      return {};
    },
  ],
  decorators: [
    (Story) => (
      <SWRConfig value={{ provider: () => new Map() }}>
        <div className="mx-auto max-w-3xl p-4">
          <Story />
        </div>
      </SWRConfig>
    ),
  ],
  args: {
    userId: "guest",
    disabled: false,
    onJoin: async () => {
      joined = true;
    },
  },
  parameters: {
    msw: {
      handlers: [
        http.get("*/game/dungeons/public", () =>
          HttpResponse.json([
            {
              resource_id: "book",
              name: "マスタリングTCP/IPの読書メモ",
              owner_id: "owner",
              owner_name: "作成者",
              joined,
            },
            {
              resource_id: "book-2",
              name: "認知心理学と学習の記録",
              owner_id: "owner-2",
              owner_name: "別の作成者",
              joined: true,
            },
          ]),
        ),
      ],
    },
  },
} satisfies Meta<typeof PublicDungeons>;
export const Default: StoryObj<typeof PublicDungeons> = {};
