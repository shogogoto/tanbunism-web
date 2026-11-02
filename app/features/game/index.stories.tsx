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
import type { Product } from "./EconomyPanel";
import { defaultBalance } from "./battle";
import { sampleCatalog } from "./catalog.fixtures";
import { type EquipmentBuff, type GameSave, newSave } from "./domain";
import type { GameState } from "./state";

const products: Product[] = (
  [
    {
      id: "sword",
      name: "銅の剣",
      kind: "weapon",
      category: "weapon",
      icon: "sword",
      amount: 10,
      equipment_buffs: [{ stat: "attack", amount: 10, amount_mode: "fixed" }],
    },
    {
      id: "shield",
      name: "魔除けの盾",
      kind: "weapon",
      category: "armor",
      icon: "shield",
      amount: 8,
      equipment_buffs: [
        { stat: "defense", amount: 8, amount_mode: "fixed" },
        { stat: "maxHp", amount: 20, amount_mode: "percent" },
      ],
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
  ] satisfies Omit<Product, "price">[]
).map((product) => ({ ...product, price: null }));

// Short and long tabs intentionally share one dialog to exercise its top anchor.
const save: GameSave = {
  ...newSave(),
  economy: {
    gold: 300,
    inventory: Object.fromEntries(products.map((product) => [product.id, 1])),
    weapon: "sword",
    weapon_attack: 10,
    remaining_uses: { sword: 18, shield: 12 },
    equipment_buffs: [{ stat: "attack", amount: 10, amount_mode: "fixed" }],
    equipment: {
      arm1: {
        item_id: "sword",
        max_uses: 30,
        defensive: false,
        buffs: [{ stat: "attack", amount: 10, amount_mode: "fixed" }],
      },
    },
  },
  unlockedDungeons: Array.from({ length: 30 }, (_, i) => ({
    resourceId: `resource-${i}`,
    sourceId: "source",
    name: `ダンジョン ${i + 1}`,
    achievement: i,
  })),
};
let snapshot: GameState = { revision: 0, save: structuredClone(save) };

export default {
  title: "Game/Menu",
  component: GamePlay,
  args: { userId: "preview", playerName: "プレイヤー" },
  loaders: [
    async () => {
      snapshot = { revision: 0, save: structuredClone(save) };
      return {};
    },
  ],
  parameters: {
    reactRouter: { route: "/game/status" },
    msw: {
      handlers: [
        http.get("*/game/state", () => HttpResponse.json(snapshot)),
        http.post("*/game/inventory/equip", async ({ request }) => {
          const body = (await request.json()) as {
            revision: number;
            product_id: string;
            slot: string;
          };
          const product = products.find((item) => item.id === body.product_id);
          const economy = snapshot.save.economy;
          if (!product || !economy?.equipment)
            return new HttpResponse(null, { status: 404 });
          const removing = economy.equipment[body.slot]?.item_id === product.id;
          for (const slot of Object.keys(economy.equipment))
            if (economy.equipment[slot].item_id === product.id)
              delete economy.equipment[slot];
          if (!removing)
            economy.equipment[body.slot] = {
              item_id: product.id,
              max_uses: product.max_uses ?? 30,
              defensive: product.category !== "weapon",
              buffs: (product.equipment_buffs ?? []) as EquipmentBuff[],
            };
          economy.equipment_buffs = Object.values(economy.equipment).flatMap(
            (item) => item.buffs ?? [],
          );
          economy.weapon_attack = economy.equipment_buffs
            .filter(
              (buff) => buff.stat === "attack" && buff.amount_mode === "fixed",
            )
            .reduce((sum, buff) => sum + buff.amount, 0);
          economy.weapon = Object.values(economy.equipment)[0]?.item_id ?? null;
          snapshot.revision++;
          return HttpResponse.json(snapshot);
        }),
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
        http.get("*/game/dungeons/public", () =>
          HttpResponse.json([
            {
              resource_id: "library-resource",
              name: "旅人の読書メモ",
              owner_id: "traveler",
              owner_name: "旅人",
              joined: false,
              key_owned: false,
            },
          ]),
        ),
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
