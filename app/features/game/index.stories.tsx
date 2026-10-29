import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { SWRConfig } from "swr";
import { AuthContext } from "~/features/auth/AuthProvider";
import GlobalHotkeys, {
  HotkeyProvider,
} from "~/features/hotkeys/GlobalHotkeys";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import { GamePlay } from ".";
import { defaultBalance } from "./battle";
import { sampleCatalog } from "./catalog.fixtures";
import { newSave } from "./domain";

const products = [
  {
    id: "sword",
    name: "銅の剣",
    kind: "weapon",
    category: "weapon",
    icon: "sword",
    amount: 10,
  },
  {
    id: "shield",
    name: "魔除けの盾",
    kind: "weapon",
    category: "armor",
    icon: "shield",
    amount: 8,
  },
  {
    id: "potion",
    name: "HP回復薬",
    kind: "hp",
    category: "recovery",
    icon: "flask",
    amount: 30,
  },
  {
    id: "ether",
    name: "MP回復薬",
    kind: "mp",
    category: "recovery",
    icon: "droplet",
    amount: 10,
  },
  {
    id: "key",
    name: "読書メモのダンジョン開放キー",
    kind: "dungeon_unlock",
    category: "unlock_key",
    icon: "key",
    amount: 0,
  },
  {
    id: "charm",
    name: "旅のお守り",
    kind: "skill",
    category: "other",
    icon: "sparkles",
    amount: 0,
  },
].map((product) => ({ ...product, price: null }));

// Short and long tabs intentionally share one dialog to exercise its top anchor.
const save = {
  ...newSave(),
  economy: {
    gold: 300,
    inventory: Object.fromEntries(products.map((product) => [product.id, 1])),
    weapon: null,
    weapon_attack: 0,
  },
  unlockedDungeons: Array.from({ length: 30 }, (_, i) => ({
    resourceId: `resource-${i}`,
    sourceId: "source",
    name: `ダンジョン ${i + 1}`,
    achievement: i,
  })),
};

export default {
  title: "Game/Menu",
  component: GamePlay,
  args: { userId: "preview", playerName: "プレイヤー" },
  parameters: {
    reactRouter: { route: "/game/status" },
    msw: {
      handlers: [
        http.get("*/game/state", () =>
          HttpResponse.json({ revision: 0, save }),
        ),
        http.get("*/game/balance", () => HttpResponse.json(defaultBalance)),
        http.get("*/game/adventure-access", () =>
          HttpResponse.json({
            available: true,
            server_now: Date.now(),
            next_available_at: Date.now(),
          }),
        ),
        http.get("*/user/:id/learning-progress", () =>
          HttpResponse.json({ level: 10 }),
        ),
        http.get("*/game/shop", () => HttpResponse.json({ products })),
        http.get("*/game/catalog", () => HttpResponse.json(sampleCatalog)),
        http.get("*/game/gambits/capacity", () =>
          HttpResponse.json({ slots: 1, next_level: 20 }),
        ),
        http.get("*/game/specialties", () =>
          HttpResponse.json({
            slots: 1,
            next_level: 20,
            available: [],
            names: {},
            amounts: {},
          }),
        ),
      ],
    },
  },
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={{
          user: undefined,
          isLoading: false,
          isValidating: false,
          isAuthenticated: false,
          signOut: async () => undefined,
          mutate: async () => undefined,
        }}
      >
        <SWRConfig value={{ provider: () => new Map(), errorRetryCount: 0 }}>
          <HistoryPanelProvider>
            <HotkeyProvider>
              <GlobalHotkeys />
              <Routes>
                <Route path="/game/:menu?" element={<Story />} />
              </Routes>
            </HotkeyProvider>
          </HistoryPanelProvider>
        </SWRConfig>
      </AuthContext.Provider>
    ),
  ],
} satisfies Meta<typeof GamePlay>;

export const TabsWithDifferentHeights: StoryObj<typeof GamePlay> = {};
