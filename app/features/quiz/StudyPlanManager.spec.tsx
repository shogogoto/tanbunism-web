import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudyPlanManager from "./StudyPlanManager";
import {
  type StudyPlan,
  deleteStudyPlan,
  listStudyPlanPreparations,
  listStudyPlans,
  listStudyResources,
  prepareAdditionalStudyPlanQuizzes,
} from "./api";

const { refreshNotifications } = vi.hoisted(() => ({
  refreshNotifications: vi.fn(),
}));

vi.mock("~/features/notifications/NotificationProvider", () => ({
  useNotifications: () => ({ refreshNotifications }),
}));

vi.mock("./api", () => ({
  createStudyPlan: vi.fn(),
  updateStudyPlan: vi.fn(),
  deleteStudyPlan: vi.fn(),
  listStudyPlans: vi.fn(),
  listStudyPlanPreparations: vi.fn(),
  listStudyResources: vi.fn(),
  prepareAdditionalStudyPlanQuizzes: vi.fn(),
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
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    vi.mocked(listStudyPlans).mockResolvedValue([plan]);
    vi.mocked(listStudyResources).mockResolvedValue([
      { uid: "resource-1", name: "数学の本" },
    ]);
    vi.mocked(listStudyPlanPreparations).mockResolvedValue([
      { plan_id: "plan-1", prepared_quiz_count: 4 },
    ]);
    vi.mocked(deleteStudyPlan).mockResolvedValue();
    vi.mocked(prepareAdditionalStudyPlanQuizzes).mockResolvedValue({
      plan_id: "plan-1",
      requested_count: 6,
      added_count: 3,
      prepared_quiz_count: 7,
    });
    refreshNotifications.mockReset();
    refreshNotifications.mockResolvedValue(undefined);
  });

  it("スマホでは横長の表をカード表示に切り替える", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });

    render(
      <MemoryRouter>
        <StudyPlanManager />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("article")).toHaveTextContent("数学の復習");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
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
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "解く" })).toHaveAttribute(
      "href",
      "/quiz?plan=plan-1",
    );
  });

  it("StudyPlanへ指定数のクイズを追加し、完了を通知する", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <StudyPlanManager />
      </MemoryRouter>,
    );

    await screen.findByText("数学の復習");
    const count = screen.getByRole("spinbutton", {
      name: "数学の復習に追加する問題数",
    });
    await user.clear(count);
    await user.type(count, "6");
    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() =>
      expect(prepareAdditionalStudyPlanQuizzes).toHaveBeenCalledWith(
        "plan-1",
        6,
      ),
    );
    expect(screen.getByText("7")).toBeVisible();
    expect(refreshNotifications).toHaveBeenCalledOnce();
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
