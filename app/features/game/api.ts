import {
  type ReadableQuiz,
  listStudyPlans,
  recommendQuizzes,
} from "~/features/quiz/api";
import { searchByTextTanbunGet } from "~/shared/generated/tanbun/tanbun";

export type PathKnowledge = { uid: string; sentence: string };
export type DungeonContent = {
  knowledge: PathKnowledge[];
  quizzes: ReadableQuiz[];
};
const sameId = (a: string, b: string) =>
  a.replaceAll("-", "").toLowerCase() === b.replaceAll("-", "").toLowerCase();

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
