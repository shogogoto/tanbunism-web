import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { useIsMobile } from "~/shared/hooks/use-mobile";
import StudyPlanList from "./StudyPlanList";
import type { StudyPlan } from "./api";
import { type PlanSort, sortStudyPlans } from "./studyPlanView";

const plans: StudyPlan[] = [
  {
    uid: "network",
    name: "ネットワーク復習",
    resource_ids: ["tcp"],
    quiz_types: ["sent2term", "term2sent"],
    n_quiz: 5,
    n_option: 4,
    created: "2026-10-01",
    default_resource_plan: false,
  },
  {
    uid: "memory",
    name: "学習と記憶",
    resource_ids: ["learning"],
    quiz_types: ["pair2rel", "rel2pair"],
    n_quiz: 5,
    n_option: 4,
    created: "2026-10-01",
    default_resource_plan: true,
  },
];
const names = new Map([
  ["tcp", "TCP/IPの基礎"],
  ["learning", "記憶と学習"],
]);
const counts = { network: 12, memory: 25 };
const achievements = { tcp: 5, learning: 10 };

function Preview() {
  const [selectedPlanIds, setSelectedPlanIds] = useState(new Set<string>());
  const [currentPlanId, setCurrentPlanId] = useState<string | undefined>(
    plans[0].uid,
  );
  const [sort, setSort] = useState<PlanSort>();
  const rowRefs = useRef(new Map<string, HTMLElement>());
  return (
    <div className="p-4 pt-24">
      <StudyPlanList
        isMobile={useIsMobile(1024)}
        isLoading={false}
        filteredPlans={sortStudyPlans(plans, sort, names, counts, achievements)}
        currentPlan={plans.find((plan) => plan.uid === currentPlanId)}
        setCurrentPlanId={setCurrentPlanId}
        selectedPlanIds={selectedPlanIds}
        setSelectedPlanIds={setSelectedPlanIds}
        rowRefs={rowRefs}
        preparedCounts={counts}
        preparationStates={{}}
        resourceName={(id) => names.get(id) ?? id}
        adventureAchievements={achievements}
        sort={sort}
        toggleSort={(column) =>
          setSort((value) => ({
            column,
            direction:
              value?.column === column && value.direction === "ascending"
                ? "descending"
                : "ascending",
          }))
        }
      />
    </div>
  );
}

export default {
  title: "Quiz/StudyPlanList",
  component: Preview,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Preview>;
export const Default: StoryObj<typeof Preview> = {};
