import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { SWRConfig } from "swr";
import { AuthContext } from "~/features/auth/AuthProvider";
import { HotkeyProvider } from "~/features/hotkeys/GlobalHotkeys";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import { GamePlay } from ".";
import { defaultBalance } from "./battle";
import { sampleCatalog } from "./catalog.fixtures";
import { enterDungeon, newSave } from "./domain";
import type { GameState } from "./state";

const knowledge = [
  { uid: "sentence", sentence: "知識の進路", term: { names: ["進路"] } },
];
const initial = enterDungeon(newSave(), "book", "出発元", 1);
const initialState: GameState = {
  revision: 1,
  save: {
    ...initial,
    content: { knowledge, quizzes: [] },
    run: initial.run
      ? { ...initial.run, hp: 24, mp: 1, maxMp: 3, moves: 2 }
      : undefined,
    unlockedDungeons: [
      {
        sourceId: "book",
        resourceId: "previous",
        name: "未踏の本",
        achievement: 0,
      },
    ],
  },
};
let snapshot = structuredClone(initialState);

export default {
  title: "Game/DungeonTransfer",
  component: GamePlay,
  args: { userId: "preview", playerName: "プレイヤー" },
  loaders: [
    async () => {
      snapshot = structuredClone(initialState);
      return {};
    },
  ],
  parameters: {
    reactRouter: { route: "/game" },
    msw: {
      handlers: [
        http.get("*/game/state", () => HttpResponse.json(snapshot)),
        http.put("*/game/state", async ({ request }) => {
          const update = (await request.json()) as GameState;
          const run = update.save.run;
          if (run && (run.mp ?? 0) > (run.maxMp ?? 0))
            return HttpResponse.json(
              {
                detail: [
                  {
                    loc: ["body", "save"],
                    msg: "Value error, MPが最大値を超えています。",
                  },
                ],
              },
              { status: 422 },
            );
          snapshot = { revision: snapshot.revision + 1, save: update.save };
          return HttpResponse.json(snapshot);
        }),
        http.get("*/game/balance", () =>
          HttpResponse.json({ ...defaultBalance, base_mp: 3 }),
        ),
        http.get("*/game/battle/context", () =>
          HttpResponse.json({
            balance: { ...defaultBalance, base_mp: 3 },
            enemies: [],
          }),
        ),
        http.get("*/game/adventure-access", () =>
          HttpResponse.json({
            available: false,
            server_now: Date.now(),
            next_available_at: Date.now() + 600000,
          }),
        ),
        http.get("*/user/:id/learning-progress", () =>
          HttpResponse.json({ level: 10 }),
        ),
        http.get("*/user/:id/resource-growth", () =>
          HttpResponse.json({
            resources: [
              {
                resource_id: "book",
                resource_name: "出発元",
                power: 20,
                level: 1,
              },
              {
                resource_id: "previous",
                resource_name: "未踏の本",
                power: 10,
                level: 1,
              },
            ],
          }),
        ),
        http.get("*/game/dungeons/:id/preparation", () =>
          HttpResponse.json({
            prepared_regions: 0,
            target_regions: 0,
            status: "ready",
          }),
        ),
        http.get("*/tanbun/", () => HttpResponse.json({ data: knowledge })),
        http.get("*/quiz/study-plans", () => HttpResponse.json([])),
        http.post("*/game/knowledge/validate", async ({ request }) =>
          HttpResponse.json(
            ((await request.json()) as { sentence_ids: string[] }).sentence_ids,
          ),
        ),
        http.get("*/game/catalog", () => HttpResponse.json(sampleCatalog)),
        http.get("*/game/shop", () => HttpResponse.json({ products: [] })),
        http.get("*/game/specialties", () =>
          HttpResponse.json({
            slots: 1,
            next_level: 20,
            available: [],
            names: {},
            amounts: {},
          }),
        ),
        http.get("*/game/gambits/capacity", () =>
          HttpResponse.json({ slots: 1, next_level: 20 }),
        ),
      ],
    },
  },
  decorators: [
    (Story) => (
      <AuthContext.Provider
        value={{
          user: {
            uid: "preview",
            email: "preview@example.test",
            created: "2026-10-24",
          },
          isLoading: false,
          isValidating: false,
          isAuthenticated: true,
          signOut: async () => undefined,
          mutate: async () => undefined,
        }}
      >
        <SWRConfig value={{ provider: () => new Map(), errorRetryCount: 0 }}>
          <HistoryPanelProvider>
            <HotkeyProvider>
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
export const LowMpUnvisitedDungeon: StoryObj<typeof GamePlay> = {};
