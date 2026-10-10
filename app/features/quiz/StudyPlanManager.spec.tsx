import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { SWRConfig } from "swr";
import { beforeEach, expect, it, vi } from "vitest";
import StudyPlanManager from "./StudyPlanManager";
import {
  deleteStudyPlan,
  listStudyPlanPreparations,
  listStudyPlans,
  listStudyResources,
  prepareAdditionalStudyPlanQuizzes,
  prepareSelectedStudyPlans,
  updateStudyPlan,
} from "./api";

vi.mock("~/features/notifications/NotificationProvider", () => ({
  useNotifications: () => ({
    notifications: [],
    refreshNotifications: vi.fn(),
  }),
}));

vi.mock("~/features/game/state", () => ({
  requestGameState: vi.fn().mockResolvedValue({ revision: 0, save: {} }),
}));

vi.mock("./api", () => ({
  deleteStudyPlan: vi.fn(),
  listStudyPlanPreparations: vi.fn(),
  listStudyPlans: vi.fn(),
  listStudyResources: vi.fn(),
  prepareAdditionalStudyPlanQuizzes: vi.fn(),
  prepareSelectedStudyPlans: vi.fn(),
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
  default_resource_plan: false,
};

const secondPlan = {
  ...plan,
  uid: "plan-2",
  name: "ネットワーク復習",
  resource_ids: ["resource-2"],
  quiz_types: ["sent2term" as const, "pair2rel" as const],
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
  vi.mocked(prepareSelectedStudyPlans).mockResolvedValue({
    accepted_count: 2,
  });
});

function renderManager() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <MemoryRouter>
        <StudyPlanManager />
        <Location />
      </MemoryRouter>
    </SWRConfig>,
  );
}

function Location() {
  const location = useLocation();
  return (
    <output aria-label="現在地">
      {location.pathname}
      {location.search}
    </output>
  );
}

it("PlanとResourceを省略可能な表として表示する", async () => {
  const user = userEvent.setup();
  renderManager();

  expect(await screen.findByRole("table")).toHaveTextContent(plan.name);
  expect(screen.getByText(plan.name)).toHaveAttribute("title", plan.name);
  expect(
    screen.getByText("とても長いResource名").closest("[title]"),
  ).toHaveAttribute("title", "とても長いResource名");
  expect(screen.queryByRole("columnheader", { name: "操作" })).toBeNull();
  expect(screen.getByRole("columnheader", { name: "達成度" })).toBeVisible();
  expect(screen.getByRole("columnheader", { name: "準備済み" })).toBeVisible();
  expect(screen.queryByRole("columnheader", { name: "1回" })).toBeNull();
  expect(screen.getByRole("columnheader", { name: "選択肢" })).toBeVisible();
  expect(
    screen.getByRole("columnheader", { name: "Plan" }).closest("thead"),
  ).toHaveClass("sticky");
  expect(screen.getByLabelText("単文から用語: OFF")).toHaveTextContent("OFF");
  expect(screen.getByLabelText("用語から単文: ON")).toHaveTextContent("ON");
  expect(
    screen.getByRole("button", { name: "学習計画を作成" }).closest(".sticky"),
  ).not.toBeNull();

  await user.click(
    screen.getByRole("checkbox", {
      name: "とても長い学習計画の名前を選択",
    }),
  );
  expect(screen.getByRole("link", { name: "解く" })).toHaveAttribute(
    "href",
    "/review?view=quiz&plan=plan-1",
  );
});

it("PlanのcacheをResourceと準備状況の更新待ちにせず表示する", async () => {
  vi.mocked(listStudyResources).mockImplementationOnce(
    () => new Promise(() => undefined),
  );
  vi.mocked(listStudyPlanPreparations).mockImplementationOnce(
    () => new Promise(() => undefined),
  );

  renderManager();

  expect(await screen.findByText(plan.name)).toBeVisible();
  expect(screen.queryByLabelText("読み込み中")).not.toBeInTheDocument();
});

it("読み込み表示を表のbody内に表示する", async () => {
  let resolvePlans: ((plans: (typeof plan)[]) => void) | undefined;
  vi.mocked(listStudyPlans).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolvePlans = resolve;
      }),
  );
  renderManager();

  const loading = screen.getByLabelText("読み込み中");
  expect(loading.closest("tbody")).not.toBeNull();

  resolvePlans?.([plan]);
  expect(await screen.findByText(plan.name)).toBeVisible();
});

it("Plan名とResource名を検索する", async () => {
  const user = userEvent.setup();
  vi.mocked(listStudyPlans).mockResolvedValue([plan, secondPlan]);
  vi.mocked(listStudyResources).mockResolvedValue([
    { uid: "resource-1", name: "とても長いResource名" },
    { uid: "resource-2", name: "TCP/IP入門" },
  ]);
  renderManager();

  const search = await screen.findByRole("searchbox", {
    name: "StudyPlanを検索",
  });
  expect(search.parentElement).toHaveClass("sticky");
  await user.type(search, "TCP/IP");

  expect(screen.getByText(secondPlan.name)).toBeVisible();
  expect(screen.queryByText(plan.name)).toBeNull();
});

it("新しいStudyPlanでは4形式を既定で選択する", async () => {
  const user = userEvent.setup();
  renderManager();
  await screen.findByText(plan.name);

  await user.click(screen.getByRole("button", { name: "学習計画を作成" }));

  for (const label of [
    "用語から単文",
    "単文から用語",
    "関係から単文の組",
    "単文の組から関係",
  ]) {
    expect(screen.getByRole("checkbox", { name: label })).toBeChecked();
  }
  expect(
    screen.getByRole("spinbutton", { name: "出題数（合計）" }),
  ).toHaveValue(5);
});

it("jとkでcurrentのStudyPlanを移動する", async () => {
  const user = userEvent.setup();
  vi.mocked(listStudyPlans).mockResolvedValue([plan, secondPlan]);
  vi.mocked(listStudyResources).mockResolvedValue([
    { uid: "resource-1", name: "とても長いResource名" },
    { uid: "resource-2", name: "TCP/IP入門" },
  ]);
  renderManager();

  const firstRow = (await screen.findByText(plan.name)).closest("tr");
  const secondRow = screen.getByText(secondPlan.name).closest("tr");
  expect(firstRow).toHaveAttribute("aria-current", "true");

  await user.keyboard("j");
  expect(secondRow).toHaveAttribute("aria-current", "true");
  expect(screen.getByRole("link", { name: "解く" })).toHaveAttribute(
    "href",
    "/review?view=quiz&plan=plan-2",
  );

  await user.keyboard("k");
  expect(firstRow).toHaveAttribute("aria-current", "true");
});

it("Spaceでcurrentのチェックを切り替える", async () => {
  const user = userEvent.setup();
  renderManager();
  const checkbox = await screen.findByRole("checkbox", {
    name: `${plan.name}を選択`,
  });

  await user.keyboard(" ");
  expect(checkbox).toBeChecked();
  await user.keyboard(" ");
  expect(checkbox).not.toBeChecked();
});

it("aで追加しeで編集する", async () => {
  const user = userEvent.setup();
  renderManager();
  await screen.findByText(plan.name);

  await user.keyboard("a");
  await waitFor(() =>
    expect(prepareAdditionalStudyPlanQuizzes).toHaveBeenCalledWith(
      plan.uid,
      plan.n_quiz,
    ),
  );

  await user.keyboard("e");
  expect(screen.getByRole("heading", { name: "学習計画を編集" })).toBeVisible();
});

it("Enterでcurrentのクイズを開く", async () => {
  const user = userEvent.setup();
  renderManager();
  await screen.findByText(plan.name);

  await user.keyboard("{Enter}");

  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/review?view=quiz&plan=plan-1",
  );
});

it("StudyPlanへ指定数のクイズを追加する", async () => {
  const user = userEvent.setup();
  renderManager();

  await user.click(
    await screen.findByRole("checkbox", {
      name: "とても長い学習計画の名前を選択",
    }),
  );
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

it("選択したStudyPlanをバックグラウンドで一括準備する", async () => {
  const user = userEvent.setup();
  vi.mocked(listStudyPlans).mockResolvedValue([plan, secondPlan]);
  vi.mocked(listStudyResources).mockResolvedValue([
    { uid: "resource-1", name: "とても長いResource名" },
    { uid: "resource-2", name: "TCP/IP入門" },
  ]);
  renderManager();

  await user.click(
    await screen.findByRole("checkbox", { name: `${plan.name}を選択` }),
  );
  await user.click(
    screen.getByRole("checkbox", { name: `${secondPlan.name}を選択` }),
  );
  await user.click(screen.getByRole("button", { name: "選択した2件を準備" }));

  expect(
    screen.getByRole("heading", { name: "クイズを一括準備" }),
  ).toBeVisible();
  expect(screen.getByText("10問")).toBeVisible();
  const count = screen.getByRole("spinbutton", {
    name: "各学習計画に追加する問題数",
  });
  await user.clear(count);
  await user.type(count, "3");
  expect(screen.getByText("6問")).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "バックグラウンドで準備" }),
  );

  await waitFor(() =>
    expect(prepareSelectedStudyPlans).toHaveBeenCalledWith(
      [plan.uid, secondPlan.uid],
      3,
    ),
  );
  expect(screen.getByText("0件選択中")).toBeVisible();
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

it("ゲーム連携された既定StudyPlanは削除できない", async () => {
  const user = userEvent.setup();
  const defaultPlan = { ...plan, default_resource_plan: true };
  vi.mocked(listStudyPlans).mockResolvedValue([defaultPlan]);
  renderManager();

  expect(await screen.findByText("ゲーム連携・削除不可")).toBeVisible();
  await user.click(
    screen.getByRole("checkbox", {
      name: `${defaultPlan.name}を選択`,
    }),
  );

  expect(screen.queryByRole("button", { name: "1件を削除" })).toBeNull();
});
