import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import PlanReviewProgress from "./PlanReviewProgress";

vi.mock("~/features/gamification/ResourceGrowth", () => ({
  useResourceGrowth: () => ({
    data: {
      resources: [
        {
          resource_id: "aabb",
          resource_name: "対象の本",
          level: 2,
          current_level_xp: 7,
          xp_for_next_level: 20,
        },
        {
          resource_id: "other",
          resource_name: "別の本",
          level: 9,
          current_level_xp: 1,
          xp_for_next_level: 90,
        },
      ],
    },
  }),
}));

it("Planに含まれるリソースだけのLv・XPを表示する", () => {
  render(
    <MemoryRouter>
      <PlanReviewProgress
        plan={{
          uid: "plan-1",
          name: "学習計画",
          resource_ids: ["aa-bb"],
          quiz_types: ["term2sent"],
          n_quiz: 5,
          n_option: 4,
          created: "2026-10-07",
        }}
      />
    </MemoryRouter>,
  );
  expect(screen.getByText("Lv.2")).toBeVisible();
  expect(screen.getByText("7 / 20 XP")).toBeVisible();
  expect(screen.getByRole("link", { name: "対象の本" })).toHaveAttribute(
    "href",
    "/resource/aabb",
  );
  expect(screen.queryByText("別の本")).not.toBeInTheDocument();
});
