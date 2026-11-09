import type { GameSave } from "~/features/game/domain";
import { PLACES_PER_REGION } from "~/features/game/exploration";
import type { QuizType, StudyPlan } from "./api";

export const normalizeResourceId = (id: string) =>
  id.replaceAll("-", "").toLowerCase();
export type PlanSortColumn =
  | "name"
  | "resource"
  | "achievement"
  | "prepared"
  | "options"
  | QuizType;
export type PlanSort = {
  column: PlanSortColumn;
  direction: "ascending" | "descending";
};

export function dungeonAchievements(
  save: Pick<GameSave, "maps" | "run" | "dungeons">,
): Record<string, number> {
  const counts = new Map<string, number>();
  for (const [id, map] of Object.entries(save.maps ?? {}))
    counts.set(normalizeResourceId(id), map.places.length);
  const runs = [
    save.run,
    ...Object.values(save.dungeons ?? {}).map((dungeon) => dungeon.run),
  ];
  for (const run of runs) {
    if (run && !counts.has(normalizeResourceId(run.resourceId)))
      counts.set(normalizeResourceId(run.resourceId), run.readIds.length);
  }
  return Object.fromEntries(
    [...counts].map(([id, count]) => [
      id,
      Math.floor(count / PLACES_PER_REGION),
    ]),
  );
}

export function filterStudyPlans(
  plans: StudyPlan[],
  query: string,
  names: ReadonlyMap<string, string>,
): StudyPlan[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return plans;
  return plans.filter((plan) =>
    `${plan.name} ${plan.resource_ids.map((id) => names.get(normalizeResourceId(id)) ?? "不明なResource").join(" ")}`
      .toLocaleLowerCase()
      .includes(normalized),
  );
}

export function sortStudyPlans(
  plans: StudyPlan[],
  sort: PlanSort | undefined,
  names: ReadonlyMap<string, string>,
  counts: Record<string, number>,
  achievements: Record<string, number>,
): StudyPlan[] {
  if (!sort) return plans;
  const value = (plan: StudyPlan): string | number | boolean | null => {
    switch (sort.column) {
      case "name":
        return plan.name;
      case "resource":
        return plan.resource_ids
          .map((id) => names.get(normalizeResourceId(id)) ?? "不明なResource")
          .join(" ");
      case "achievement":
        return plan.resource_ids.length === 1
          ? (achievements[normalizeResourceId(plan.resource_ids[0])] ?? 0)
          : null;
      case "prepared":
        return counts[plan.uid] ?? 0;
      case "options":
        return plan.n_option;
      default:
        return plan.quiz_types.includes(sort.column);
    }
  };
  // Sort a copy. Ties retain API order, and non-applicable values stay last in either direction.
  return plans
    .map((plan, index) => ({ plan, index }))
    .sort((a, b) => {
      const left = value(a.plan);
      const right = value(b.plan);
      if (left === null) return right === null ? a.index - b.index : 1;
      if (right === null) return -1;
      const comparison =
        typeof left === "string" && typeof right === "string"
          ? left.localeCompare(right, "ja")
          : Number(left) - Number(right);
      return comparison
        ? comparison * (sort.direction === "ascending" ? 1 : -1)
        : a.index - b.index;
    })
    .map(({ plan }) => plan);
}
