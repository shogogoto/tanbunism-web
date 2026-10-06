import type { GrowthResult } from "~/features/gamification/ResourceGrowth";
import type { NameSpace } from "~/shared/generated/fastAPI.schemas";

export const shelfFixture = {
  user_id: "25fe8b78-9f8a-4f70-85f3-cfa28a780402",
  roots_: {},
  stats: {},
  g: {
    directed: true,
    multigraph: false,
    graph: {},
    edges: [],
    nodes: [
      {
        id: {
          uid: "10000000-0000-0000-0000-000000000001",
          name: "# リーダブルコード",
          authors: ["ダスティン・ボズウェル"],
          published: null,
        },
      },
      {
        id: {
          uid: "10000000-0000-0000-0000-000000000002",
          name: "# 神は数学者か？",
          authors: ["マリオ・リヴィオ"],
          published: null,
        },
      },
      {
        id: {
          uid: "10000000-0000-0000-0000-000000000003",
          name: "# 論理学入門",
          authors: ["野矢茂樹"],
          published: null,
        },
      },
    ],
  },
} as unknown as NameSpace;

export const growthFixture: GrowthResult = {
  rules: { exposure_xp: 1, answer_xp: 5, correct_bonus_xp: 2, level_curve: 50 },
  resources: [
    {
      resource_id: "10000000-0000-0000-0000-000000000001",
      total_xp: 80,
      level: 2,
      current_level_xp: 30,
      xp_for_next_level: 150,
      power: 26,
      logic_count: 10,
      reference_count: 16,
      exposure_xp: 10,
      answer_xp: 50,
      correct_bonus_xp: 20,
      last_reviewed_on: "2026-10-08",
      recent_xp: [
        {
          source: "quiz_answer",
          xp: 5,
          subject: "順番を一貫させる",
          earned_on: "2026-10-08",
        },
      ],
    },
    {
      resource_id: "10000000-0000-0000-0000-000000000002",
      total_xp: 155,
      level: 2,
      current_level_xp: 105,
      xp_for_next_level: 150,
      power: 64,
      logic_count: 20,
      reference_count: 44,
      exposure_xp: 15,
      answer_xp: 100,
      correct_bonus_xp: 40,
      last_reviewed_on: "2026-10-07",
      recent_xp: [],
    },
    {
      resource_id: "10000000-0000-0000-0000-000000000003",
      total_xp: 0,
      level: 1,
      current_level_xp: 0,
      xp_for_next_level: 50,
      power: 12,
      logic_count: 9,
      reference_count: 3,
      exposure_xp: 0,
      answer_xp: 0,
      correct_bonus_xp: 0,
      last_reviewed_on: null,
      recent_xp: [],
    },
  ],
};
