import {
  type ReadableQuiz,
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
};
const sameId = (a: string, b: string) =>
  a.replaceAll("-", "").toLowerCase() === b.replaceAll("-", "").toLowerCase();

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "https://knowde.onrender.com";

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

export async function loadDungeon(resourceId: string): Promise<DungeonContent> {
  const params = { resource_id: resourceId, q: "", page: 1, size: 100 };
  const [knowledge, plans] = await Promise.all([
    searchByTextTanbunGet(params, { credentials: "include" }),
    listStudyPlans(),
  ]);
  if (knowledge.status !== 200)
    throw new Error("ダンジョンの知識を取得できませんでした。");
  const plan =
    plans.find(
      (plan) =>
        plan.resource_ids.length === 1 &&
        sameId(plan.resource_ids[0], resourceId),
    ) ??
    plans.find((plan) =>
      plan.resource_ids.some((id) => sameId(id, resourceId)),
    );
  // Use prepared quizzes only; opening a dungeon never triggers expensive generation.
  const recommendations = plan
    ? (
        await Promise.all(
          plan.quiz_types.map((type) =>
            recommendQuizzes(plan.uid, type, { generateMissing: false }),
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
