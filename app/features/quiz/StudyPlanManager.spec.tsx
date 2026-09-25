import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudyPlanManager from "./StudyPlanManager";
import {
  type StudyPlan,
  deleteStudyPlan,
  listStudyPlans,
  listStudyResources,
} from "./api";

vi.mock("./api", () => ({
  createStudyPlan: vi.fn(),
  updateStudyPlan: vi.fn(),
  deleteStudyPlan: vi.fn(),
  listStudyPlans: vi.fn(),
  listStudyResources: vi.fn(),
}));

const plan: StudyPlan = {
  uid: "plan-1",
  name: "数学の復習",
  resource_ids: ["resource-1"],
  quiz_types: ["term2sent", "pair2rel"],
  n_quiz: 6,
  n_option: 3,
  created: "2026-09-25T00:00:00Z",
};

describe("StudyPlanManager", () => {
  beforeEach(() => {
    vi.mocked(listStudyPlans).mockResolvedValue([plan]);
    vi.mocked(listStudyResources).mockResolvedValue([
      { uid: "resource-1", name: "数学の本" },
    ]);
    vi.mocked(deleteStudyPlan).mockResolvedValue();
  });

  it("計画の内容を確認し、その計画でクイズを始められる", async () => {
    render(
      <MemoryRouter>
        <StudyPlanManager />
      </MemoryRouter>,
    );

    expect(await screen.findByText("数学の復習")).toBeInTheDocument();
    expect(screen.getByText("数学の本")).toBeInTheDocument();
    expect(screen.getByText("用語 → 単文")).toBeInTheDocument();
    expect(screen.getByText("単文組 → 関係")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "この計画でクイズを解く" }),
    ).toHaveAttribute("href", "/quiz?plan=plan-1");
  });

  it("計画を削除して一覧から取り除く", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StudyPlanManager />
      </MemoryRouter>,
    );

    await screen.findByText("数学の復習");
    await user.click(screen.getByRole("button", { name: "削除" }));
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => expect(deleteStudyPlan).toHaveBeenCalledWith("plan-1"));
    expect(screen.queryByText("数学の復習")).not.toBeInTheDocument();
  });
});
