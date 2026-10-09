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
  return Object.values(chain.knowdes).filter(
    (item) =>
      ids.has(canonicalSentenceId(item.uid)) &&
      sameId(item.resource_uid, resourceId) &&
      !sameId(item.uid, sentenceId),
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
    knowledge: knowledge.data.data,
    quizzes: [
      ...new Map(
        recommendations.map((item) => [item.quiz.quiz_id, item.quiz]),
      ).values(),
    ],
  };
}
