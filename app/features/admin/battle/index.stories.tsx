import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import {
  defaultBalance,
  emptyAllocation,
  playerStats,
} from "~/features/game/battle";
import BattleSettingsManager from ".";
import type { EnemyBalanceSimulation, SimulatedPracticeInput } from "./api";

const meta = {
  title: "Admin/GameBalance",
  component: BattleSettingsManager,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: [
        http.get("*/admin/settings/game-balance", () =>
          HttpResponse.json(defaultBalance),
        ),
        http.put("*/admin/settings/game-balance", async ({ request }) =>
          HttpResponse.json(await request.json()),
        ),
        http.get("*/admin/users", () => HttpResponse.json([])),
        http.get("*/admin/game/dungeons", () => HttpResponse.json([])),
        http.get("*/game/battle/preferences", () =>
          HttpResponse.json({ tempo: "medium" }),
        ),
        http.post(
          "*/admin/settings/game-balance/simulate",
          async ({ request }) => {
            const input = (await request.json()) as Pick<
              EnemyBalanceSimulation,
              "balance" | "power" | "achievement"
            >;
            // Illustrative server responses; production calculations stay server-side.
            return HttpResponse.json({
              ...input,
              pool_quiz_count: 10,
              average_relations: 0,
              min_encounter_enemies: 1,
              max_encounter_enemies: 3,
              requested_enemy_types: 3,
              requested_quiz_count: 2,
              assigned_quiz_count: 6,
              unassigned_quiz_count: 4,
              warnings: [],
              enemies: [
                { index: 1, quiz_count: 2, hp: 28, attack: 16, relations: 0 },
                { index: 2, quiz_count: 2, hp: 30, attack: 17, relations: 0 },
                { index: 3, quiz_count: 2, hp: 26, attack: 15, relations: 0 },
              ].map((enemy) => ({
                ...enemy,
                mp: input.balance.enemy_mp,
                special_attack: input.balance.enemy_special_attack,
                special_defense: input.balance.enemy_special_defense,
              })),
            });
          },
        ),
        http.post(
          "*/admin/settings/game-balance/practice/simulation",
          async ({ request }) => {
            const input = (await request.json()) as SimulatedPracticeInput;
            const stats = playerStats(
              input.allocation ?? emptyAllocation,
              input.balance,
            );
            const enemies = input.simulation.enemies.map((enemy) => ({
              id: `enemy-${enemy.index}`,
              name: `敵 ${enemy.index}`,
              quizIndex: 0,
              quizIndexes: [0],
              hp: enemy.hp,
              attack: enemy.attack,
              mp: enemy.mp,
              special_attack: enemy.special_attack,
              special_defense: enemy.special_defense,
              region: input.simulation.achievement - 1,
              relations: 0,
            }));
            const now = Date.now();
            return HttpResponse.json({
              state: {
                revision: 0,
                save: {
                  version: 2,
                  clears: {},
                  allocation: input.allocation ?? emptyAllocation,
                  run: {
                    resourceId: "simulation",
                    name: "敵の生成プレビュー",
                    ...stats,
                    hp: stats.maxHp,
                    mp: stats.maxMp,
                    moves: 0,
                    kills: 0,
                    enemyHp: 0,
                    enemyMaxHp: 1,
                    quizCursor: 0,
                    readIds: [],
                    phase: "battle",
                    answerDeadline: now + stats.answerSeconds * 1000,
                  },
                  content: {
                    knowledge: [],
                    quizzes: [
                      {
                        quiz_id: "practice",
                        quiz_type: "sent2term",
                        prompt: { subject: "模擬回答", answer_kind: "term" },
                        statement: "正解か不正解を選んでください。",
                        options: { yes: "正解", no: "不正解" },
                        correct: ["yes"],
                        no_correct_option: false,
                        created: "2026-10-15",
                      },
                    ],
                  },
                  battle: {
                    id: "practice",
                    turn: 0,
                    region: input.simulation.achievement - 1,
                    checkpoint: "@entrance",
                    enemies: enemies.map((enemy) => enemy.id),
                    quizIndices: Object.fromEntries(
                      enemies.map((enemy) => [enemy.id, 0]),
                    ),
                  },
                },
              },
              context: { balance: input.balance, enemies },
              seed: input.seed,
              server_now: now,
            });
          },
        ),
      ],
    },
  },
} satisfies Meta<typeof BattleSettingsManager>;
export default meta;
type Story = StoryObj<typeof meta>;
export const DraftSettings: Story = {};
