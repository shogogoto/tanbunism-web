import {
  type ReadableQuiz,
  type StudyPlan,
  listStudyPlans,
  recommendQuizzes,
} from "~/features/quiz/api";
import { canonicalSentenceId } from "~/features/tanbun/detail/cache";
import type { Tanbun } from "~/shared/generated/fastAPI.schemas";
import { searchByTextTanbunGet } from "~/shared/generated/tanbun/tanbun";
import { detailTanbunSentenceSentenceIdGet } from "~/shared/generated/tanbun/tanbun";
import { tanbunDetailCache } from "~/shared/lib/indexed";

export type PathKnowledge = Pick<Tanbun, "uid" | "sentence" | "term">;
export type DungeonContent = {
  knowledge: PathKnowledge[];
  quizzes: ReadableQuiz[];
  /** The exact prepared quiz population captured when each achievement band opens. */
  regionQuizPools?: Record<string, string[]>;
  regionEnemies?: Record<string, RegionEnemy[]>;
};
export type DungeonPreparation = {
  prepared_regions: number;
  target_regions: number;
};
export type DungeonRegionQuizPool = {
  ready: boolean;
  level: number;
  required_quizzes: number;
  available_quizzes: number;
  quiz_ids: string[];
};
export type RegionEnemy = {
  id: string;
  name: string;
  quizIndex: number;
  hp?: number;
  attack?: number;
};

/** Quiz IDs, rather than quiz indexes, are the authoritative frozen population. */
export function regionQuizPool(
  content: DungeonContent,
  region: number,
): string[] {
  const explicitPool = content.regionQuizPools?.[region];
  if (explicitPool) return explicitPool;

  // Migrate older snapshots, whose enemy list implicitly recorded the pool.
  const legacyEnemies = content.regionEnemies?.[region];
  if (legacyEnemies) {
    return legacyEnemies.flatMap((enemy) => {
      const quizId = content.quizzes[enemy.quizIndex]?.quiz_id;
      return quizId ? [quizId] : [];
    });
  }
  return content.quizzes.map((quiz) => quiz.quiz_id);
}

/** Build stable enemies from the frozen population; revisits never reroll it. */
export function regionEnemies(
  content: DungeonContent,
  resourceId: string,
  region: number,
): RegionEnemy[] {
  const frozenEnemies = content.regionEnemies?.[region];
  const explicitPool = content.regionQuizPools?.[region];
  if (!explicitPool && frozenEnemies) return frozenEnemies;
  const quizIndexes = new Map(
    content.quizzes.map((quiz, index) => [quiz.quiz_id, index]),
  );
  const existingByQuizId = new Map(
    (frozenEnemies ?? []).flatMap((enemy) => {
      const quizId = content.quizzes[enemy.quizIndex]?.quiz_id;
      return quizId ? [[quizId, enemy] as const] : [];
    }),
  );
  return (explicitPool ?? regionQuizPool(content, region)).flatMap(
    (quizId, enemyIndex) => {
      const quizIndex = quizIndexes.get(quizId);
      if (quizIndex === undefined) return [];
      const existing = existingByQuizId.get(quizId);
      return [
        {
          id: existing?.id ?? `${resourceId}:${region}:${quizId}`,
          name: existing?.name ?? `領域 ${region + 1}の敵 ${enemyIndex + 1}`,
          quizIndex,
          hp: 20 + region * 5,
          attack: 12 + region * 2,
        },
      ];
    },
  );
}
export function freezeRegionEnemies(
  content: DungeonContent,
  resourceId: string,
  region: number,
  storedQuizPool?: string[],
): DungeonContent {
  const quizPool = storedQuizPool ?? regionQuizPool(content, region);
  const quizIndexes = new Map(
    content.quizzes.map((quiz, index) => [quiz.quiz_id, index]),
  );
  return {
    ...content,
    regionQuizPools: {
      ...content.regionQuizPools,
      [region]: quizPool,
    },
    regionEnemies: {
      ...content.regionEnemies,
      [region]: quizPool.flatMap((quizId, enemyIndex) => {
        const quizIndex = quizIndexes.get(quizId);
        if (quizIndex === undefined) return [];
        return [
          {
            id: `${resourceId}:${region}:${quizId}`,
            name: `領域 ${region + 1}の敵 ${enemyIndex + 1}`,
            quizIndex,
          },
        ];
      }),
    },
  };
}
const sameId = (a: string, b: string) =>
  a.replaceAll("-", "").toLowerCase() === b.replaceAll("-", "").toLowerCase();

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

export async function loadDungeonPreparation(
  resourceId: string,
): Promise<DungeonPreparation> {
  const response = await fetch(
    `${API_BASE_URL}/game/dungeons/${encodeURIComponent(resourceId)}/preparation`,
    { credentials: "include", cache: "no-store" },
  );
  const body = await response.json();
  if (!response.ok)
    throw new Error(body?.detail ?? "クイズの準備状況を取得できませんでした。");
  return body as DungeonPreparation;
}

export async function loadDungeonRegionQuizPool(
  resourceId: string,
  level: number,
  legacyQuizIds?: string[],
): Promise<DungeonRegionQuizPool> {
  const method = legacyQuizIds ? "POST" : "GET";
  const response = await fetch(
    `${API_BASE_URL}/game/dungeons/${encodeURIComponent(resourceId)}/regions/${level}/quiz-pool`,
    {
      method,
      credentials: "include",
      cache: "no-store",
      ...(legacyQuizIds
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quiz_ids: legacyQuizIds }),
          }
        : {}),
    },
  );
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body?.detail ?? "領域のクイズ母集団を取得できませんでした。",
    );
  return body as DungeonRegionQuizPool;
}

export function mergeDungeonContent(
  current: DungeonContent,
  refreshed: DungeonContent,
): DungeonContent {
  return {
    ...refreshed,
    knowledge: [
      ...new Map(
        [...current.knowledge, ...refreshed.knowledge].map((item) => [
          item.uid,
          item,
        ]),
      ).values(),
    ],
    // Frozen enemy quizIndex values depend on the old quiz order; append new IDs.
    quizzes: [
      ...new Map(
        [...current.quizzes, ...refreshed.quizzes].map((quiz) => [
          quiz.quiz_id,
          quiz,
        ]),
      ).values(),
    ],
    regionQuizPools: current.regionQuizPools,
    regionEnemies: current.regionEnemies,
  };
}

/** Always check current ownership/location, even when the displayed text is cached. */
export async function validateKnowledge(
  resourceId: string,
  ids: string[],
): Promise<string[]> {
  const unique = [...new Set(ids.map(canonicalSentenceId))];
  const valid: string[] = [];
  for (let offset = 0; offset < unique.length; offset += 500) {
    const response = await fetch(`${API_BASE_URL}/game/knowledge/validate`, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource_id: resourceId,
        sentence_ids: unique.slice(offset, offset + 500),
      }),
    });
    if (!response.ok)
      throw new Error(
        "単文の有効性を確認できませんでした。再試行してください。",
      );
    const result: unknown = await response.json();
    if (!Array.isArray(result) || !result.every((id) => typeof id === "string"))
      throw new Error("単文の有効性を確認できませんでした。");
    valid.push(...result.map(canonicalSentenceId));
  }
  return valid;
}

async function reviewable(
  resourceId: string,
  items: PathKnowledge[],
): Promise<PathKnowledge[]> {
  const valid = new Set(
    await validateKnowledge(
      resourceId,
      items.map((item) => item.uid),
    ),
  );
  return items.filter((item) => valid.has(canonicalSentenceId(item.uid)));
}

/** Reuse sentence detail/cache; fetch only the current place, never the entire resource graph. */
export async function loadConnectedKnowledge(
  resourceId: string,
  sentenceId: string,
): Promise<PathKnowledge[]> {
  const id = canonicalSentenceId(sentenceId);
  let chain = await tanbunDetailCache.get(id).catch(() => undefined);
  if (!chain) {
    const response = await detailTanbunSentenceSentenceIdGet(id, {
      credentials: "include",
    });
    if (response.status !== 200)
      throw new Error("現在地の繋がりを取得できませんでした。");
    chain = response.data.find((item) => sameId(item.uid, sentenceId));
    if (chain) await tanbunDetailCache.set(chain).catch(() => undefined);
  }
  if (!chain) return [];
  const ids = new Set(
    chain.g.edges
      .flatMap((edge) =>
        sameId(edge.source, sentenceId)
          ? [edge.target]
          : sameId(edge.target, sentenceId)
            ? [edge.source]
            : [],
      )
      .map(canonicalSentenceId),
  );
  return reviewable(
    resourceId,
    Object.values(chain.knowdes).filter(
      (item) =>
        ids.has(canonicalSentenceId(item.uid)) &&
        sameId(item.resource_uid, resourceId) &&
        !sameId(item.uid, sentenceId),
    ),
  );
}

export async function loadDungeon(
  resourceId: string,
  preparedRegions = 0,
): Promise<DungeonContent> {
  const params = { resource_id: resourceId, q: "", page: 1, size: 100 };
  const [knowledge, plans] = await Promise.all([
    searchByTextTanbunGet(params, { credentials: "include" }),
    listStudyPlans(),
  ]);
  if (knowledge.status !== 200)
    throw new Error("ダンジョンの知識を取得できませんでした。");
  const isDefaultResourcePlan = (plan: (typeof plans)[number]) =>
    Boolean(
      (plan as StudyPlan & { default_resource_plan?: boolean })
        .default_resource_plan,
    );
  const plan =
    plans.find(
      (plan) =>
        isDefaultResourcePlan(plan) &&
        plan.resource_ids.length === 1 &&
        sameId(plan.resource_ids[0], resourceId),
    ) ??
    plans.find(
      (plan) =>
        plan.resource_ids.length === 1 &&
        sameId(plan.resource_ids[0], resourceId),
    ) ??
    plans.find((plan) =>
      plan.resource_ids.some((id) => sameId(id, resourceId)),
    );
  // Use prepared quizzes only; opening a dungeon never triggers expensive generation.
  const quizLimit = plan
    ? Math.min(
        100,
        Math.max(
          plan.quiz_types.length,
          plan.n_quiz || 5,
          (plan.n_quiz || 5) + preparedRegions * 5,
        ),
      )
    : undefined;
  const recommendations = plan
    ? (
        await Promise.all(
          plan.quiz_types.map((type) =>
            recommendQuizzes(
              plan.uid,
              type,
              quizLimit === Math.max(plan.quiz_types.length, plan.n_quiz)
                ? { generateMissing: false }
                : { generateMissing: false, limit: quizLimit },
            ),
          ),
        )
      )
        .flat()
        .filter((item) => sameId(item.resource_id, resourceId))
    : [];
  return {
    knowledge: await reviewable(resourceId, knowledge.data.data),
    quizzes: [
      ...new Map(
        recommendations.map((item) => [item.quiz.quiz_id, item.quiz]),
      ).values(),
    ],
  };
}
