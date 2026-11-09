import { expect, it } from "vitest";
import { enterDungeon, newSave } from "~/features/game/domain";
import type { StudyPlan } from "./api";
import {
  dungeonAchievements,
  filterStudyPlans,
  sortStudyPlans,
} from "./studyPlanView";

const plans: StudyPlan[] = [
  {
    uid: "a",
    name: "Alpha",
    resource_ids: ["resource-A"],
    quiz_types: ["sent2term"],
    n_quiz: 4,
    n_option: 4,
    created: "2026-10-01",
    default_resource_plan: false,
  },
  {
    uid: "b",
    name: "Beta",
    resource_ids: ["resource-B"],
    quiz_types: ["term2sent"],
    n_quiz: 4,
    n_option: 4,
    created: "2026-10-01",
    default_resource_plan: false,
  },
  {
    uid: "c",
    name: "Mixed",
    resource_ids: ["resource-A", "resource-B"],
    quiz_types: [],
    n_quiz: 4,
    n_option: 4,
    created: "2026-10-01",
    default_resource_plan: false,
  },
];
const names = new Map([
  ["resourcea", "TCP/IP"],
  ["resourceb", "学習"],
]);

it("filters by plan or resource name without changing the source list", () => {
  expect(filterStudyPlans(plans, " ALPHA ", names)).toEqual([plans[0]]);
  expect(filterStudyPlans(plans, "tcp/ip", names)).toEqual([
    plans[0],
    plans[2],
  ]);
  expect(plans.map((plan) => plan.uid)).toEqual(["a", "b", "c"]);
});

it.each(["ascending", "descending"] as const)(
  "keeps non-applicable achievement values last (%s)",
  (direction) => {
    const sorted = sortStudyPlans(
      plans,
      { column: "achievement", direction },
      names,
      {},
      { resourcea: 5, resourceb: 10 },
    );
    expect(sorted.map((plan) => plan.uid)).toEqual(
      direction === "ascending" ? ["a", "b", "c"] : ["b", "a", "c"],
    );
  },
);

it("sorts ties stably and uses prepared counts without mutating plans", () => {
  expect(
    sortStudyPlans(
      plans,
      { column: "options", direction: "descending" },
      names,
      {},
      {},
    ),
  ).toEqual(plans);
  expect(
    sortStudyPlans(
      plans,
      { column: "prepared", direction: "descending" },
      names,
      { a: 1, b: 10 },
      {},
    ).map((plan) => plan.uid),
  ).toEqual(["b", "a", "c"]);
  expect(plans[0].uid).toBe("a");
});

it("derives achievements from maps before falling back to the active run", () => {
  const save = enterDungeon(newSave(), "resource-A", "本", 1);
  if (save.run)
    save.run.readIds = Array.from({ length: 20 }, (_, index) => String(index));
  save.maps = {
    "resource-A": {
      current: "@entrance",
      edges: [],
      places: Array.from({ length: 6 }, (_, index) => ({
        id: String(index),
        region: 0,
      })),
    },
  };
  expect(dungeonAchievements(save)).toEqual({ resourcea: 1 });
  save.maps = {};
  expect(dungeonAchievements(save)).toEqual({ resourcea: 4 });
});
