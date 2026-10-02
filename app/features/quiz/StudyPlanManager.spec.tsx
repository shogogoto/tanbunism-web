import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import StudyPlanManager from "./StudyPlanManager";
import {
  deleteStudyPlan,
  listStudyPlanPreparations,
  listStudyPlans,
  listStudyResources,
  prepareAdditionalStudyPlanQuizzes,
  updateStudyPlan,
} from "./api";

vi.mock("~/features/notifications/NotificationProvider", () => ({
  useNotifications: () => ({ refreshNotifications: vi.fn() }),
}));

vi.mock("./api", () => ({
  deleteStudyPlan: vi.fn(),
  listStudyPlanPreparations: vi.fn(),
  listStudyPlans: vi.fn(),
  listStudyResources: vi.fn(),
  prepareAdditionalStudyPlanQuizzes: vi.fn(),
  updateStudyPlan: vi.fn(),
}));

const plan = {
  uid: "plan-1",
  name: "とても長い学習計画の名前",
  resource_ids: ["resource-1"],
  quiz_types: ["term2sent" as const],
  n_quiz: 2,
  n_option: 4,
  created: "2026-10-02T00:00:00Z",
};

beforeEach(() => {
  vi.mocked(listStudyPlans).mockResolvedValue([plan]);
  vi.mocked(listStudyResources).mockResolvedValue([
    { uid: "resource-1", name: "とても長いResource名" },
  ]);
  vi.mocked(listStudyPlanPreparations).mockResolvedValue([
    { plan_id: "plan-1", prepared_quiz_count: 3 },
  ]);
  vi.mocked(updateStudyPlan).mockResolvedValue({
    ...plan,
    quiz_types: ["term2sent", "sent2term", "rel2pair", "pair2rel"],
    n_quiz: 4,
  });
  vi.mocked(deleteStudyPlan).mockResolvedValue(undefined);
  vi.mocked(prepareAdditionalStudyPlanQuizzes).mockResolvedValue({
    plan_id: "plan-1",
    requested_count: 6,
    added_count: 3,
    prepared_quiz_count: 6,
  });
});

function renderManager() {
  return render(
    <MemoryRouter>
      <StudyPlanManager />
    </MemoryRouter>,
  );
}

it("横長の表を使わずPlanとResourceを省スペース表示する", async () => {
  renderManager();

  expect(await screen.findByRole("article")).toHaveTextContent(plan.name);
  expect(
    screen.getByText("とても長いResource名").closest("[title]"),
  ).toHaveAttribute("title", "とても長いResource名");
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "解く" })).toHaveAttribute(
    "href",
    "/quiz?plan=plan-1",
  );
});

it("StudyPlanへ指定数のクイズを追加する", async () => {
  const user = userEvent.setup();
  renderManager();

  const count = await screen.findByRole("spinbutton", {
    name: `${plan.name}に追加する問題数`,
  });
  await user.clear(count);
  await user.type(count, "6");
  await user.click(screen.getByRole("button", { name: "追加" }));

  await waitFor(() =>
    expect(prepareAdditionalStudyPlanQuizzes).toHaveBeenCalledWith("plan-1", 6),
  );
});

it("選択したStudyPlanを4形式へ一括変更する", async () => {
  const user = userEvent.setup();
  renderManager();

  await user.click(
    await screen.findByRole("checkbox", {
      name: "とても長い学習計画の名前を選択",
    }),
  );
  await user.click(screen.getByRole("button", { name: "4形式に変更" }));

  await waitFor(() => {
    expect(updateStudyPlan).toHaveBeenCalledWith("plan-1", {
      name: plan.name,
      resource_ids: plan.resource_ids,
      quiz_types: ["term2sent", "sent2term", "rel2pair", "pair2rel"],
      n_quiz: 4,
      n_option: 4,
    });
  });
});

it("行内ボタンではなく選択ツールバーからStudyPlanを削除する", async () => {
  const user = userEvent.setup();
  renderManager();

  await user.click(
    await screen.findByRole("checkbox", {
      name: "とても長い学習計画の名前を選択",
    }),
  );
  await user.click(screen.getByRole("button", { name: "1件を削除" }));
  await user.click(screen.getByRole("button", { name: "削除する" }));

  await waitFor(() => expect(deleteStudyPlan).toHaveBeenCalledWith("plan-1"));
  expect(
    screen.queryByText("とても長い学習計画の名前"),
  ).not.toBeInTheDocument();
});
