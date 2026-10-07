import { Link } from "react-router";
import { useResourceGrowth } from "~/features/gamification/ResourceGrowth";
import ReviewXpProgress from "~/features/gamification/ReviewXpProgress";
import type { StudyPlan } from "~/features/quiz/api";
import { normalizeResourceId } from "./useReviewPlans";

export default function PlanReviewProgress({ plan }: { plan: StudyPlan }) {
  const { data } = useResourceGrowth();
  const ids = new Set(plan.resource_ids.map(normalizeResourceId));
  const resources = data?.resources.filter((resource) =>
    ids.has(normalizeResourceId(resource.resource_id)),
  );
  return (
    <div className="mx-auto mb-3 max-w-3xl space-y-2 text-sm">
      <h2 className="font-semibold">{plan.name}</h2>
      {resources?.map((resource) => (
        <div
          key={resource.resource_id}
          className="flex flex-wrap items-center gap-2"
        >
          <Link
            to={`/resource/${resource.resource_id}`}
            className="min-w-0 truncate hover:underline"
          >
            {resource.resource_name}
          </Link>
          <span>Lv.{resource.level}</span>
          <ReviewXpProgress
            currentXp={resource.current_level_xp}
            requiredXp={resource.xp_for_next_level}
            className="h-1.5 w-24"
          />
          <span>
            {resource.current_level_xp} / {resource.xp_for_next_level} XP
          </span>
        </div>
      ))}
    </div>
  );
}
