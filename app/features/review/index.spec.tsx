import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import Review from ".";
import ReviewHeaderTabs from "./ReviewHeaderTabs";
import {
  ReviewProgressProvider,
  usePublishReviewProgress,
} from "./ReviewProgress";
import { useReviewTarget } from "./useReviewTarget";

const planState = vi.hoisted(() => ({
  data: [
    {
      uid: "plan-1",
      name: "対象の本",
      resource_ids: ["resource-1"],
      quiz_types: ["term2sent"],
      n_quiz: 5,
      n_option: 4,
      created: "2026-10-07",
    },
  ],
}));

function PublishProgress() {
  const target = useReviewTarget();
  usePublishReviewProgress(
    "knowledge",
    "default",
    target.selectedDay,
    2,
    30,
    true,
  );
  usePublishReviewProgress("quiz", "default", target.selectedDay, 2, 20, true);
  return null;
}

it("選択中のセットの進捗をタブへ表示し、別の対象へ混ぜない", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/review"]}>
      <ReviewProgressProvider>
        <ReviewHeaderTabs />
        <PublishProgress />
      </ReviewProgressProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole("tab", { name: "知識" })).toHaveTextContent("2/30");
  expect(screen.getByRole("tab", { name: "クイズ" })).toHaveTextContent("2/20");
  await user.selectOptions(screen.getByLabelText("復習対象"), "plan:plan-1");
  expect(screen.getByRole("tab", { name: "知識" })).not.toHaveTextContent(
    "2/30",
  );
  expect(screen.getByRole("tab", { name: "クイズ" })).not.toHaveTextContent(
    "2/20",
  );
});
vi.mock("./useReviewPlans", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useReviewPlans")>()),
  useReviewPlans: () => ({ data: planState.data }),
}));
vi.mock("./PlanReviewProgress", () => ({
  default: () => <p>対象リソースのLv・XP</p>,
}));

vi.mock("~/features/auth/AuthGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "review-test" } }),
}));
vi.mock("./ReviewSettingsSelector", () => ({
  default: ({
    selected,
    onSelect,
    recentDays,
    selectedDay,
    onSelectDay,
  }: {
    selected: string;
    onSelect: (id: string) => void;
    recentDays: string[];
    selectedDay: string;
    onSelectDay: (day: string) => void;
  }) => (
    <select
      aria-label="復習対象"
      value={selected.startsWith("plan:") ? selected : `day:${selectedDay}`}
      onChange={(event) => {
        const value = event.target.value;
        if (value.startsWith("day:")) onSelectDay(value.slice(4));
        else onSelect(value);
      }}
    >
      <option value="default">今日</option>
      {recentDays.map((day, index) => (
        <option key={day} value={`day:${day}`}>
          {index === 0 ? "今日" : day}
        </option>
      ))}
      <option value="plan:plan-1">対象の本</option>
    </select>
  ),
}));
vi.mock("./PersonalTimeline", () => ({
  default: ({
    profile,
    selectedDay,
  }: { profile: string; selectedDay?: string }) => (
    <input
      aria-label="知識の状態"
      data-profile={profile}
      data-day={selectedDay}
      defaultValue="初期値"
    />
  ),
}));
vi.mock("./QuizTimeline", () => ({
  default: ({ selectedDay }: { selectedDay?: string }) => (
    <p data-day={selectedDay}>個人の日替わりクイズ</p>
  ),
}));

it("復習日を知識・クイズで共有し、今日を含む7日を選べる", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/review"]}>
      <ReviewHeaderTabs />
      <Review />
    </MemoryRouter>,
  );
  expect(screen.queryByLabelText("復習日")).toBeNull();
  const days = screen.getByRole("combobox", { name: "復習対象" });
  const options = Array.from(
    days.querySelectorAll<HTMLOptionElement>('option[value^="day:"]'),
  );
  expect(options).toHaveLength(7);
  expect(options[0]).toHaveTextContent("今日");
  const yesterday = options[1].value.slice(4);
  await user.selectOptions(days, options[1].value);
  expect(screen.getByLabelText("知識の状態")).toHaveAttribute(
    "data-day",
    yesterday,
  );
  await user.click(screen.getByRole("tab", { name: "クイズ" }));
  expect(screen.getByText("個人の日替わりクイズ")).toHaveAttribute(
    "data-day",
    yesterday,
  );
  await user.selectOptions(days, options[0].value);
  expect(screen.getByText("個人の日替わりクイズ")).toHaveAttribute(
    "data-day",
    options[0].value.slice(4),
  );
});
vi.mock("~/features/quiz/QuizSession", () => ({
  default: ({ planId }: { planId: string }) => (
    <p data-plan={planId}>計画の準備済みクイズ</p>
  ),
}));

it("復習の知識・クイズを切り替えても知識側の状態を保持する", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/review"]}>
      <ReviewHeaderTabs />
      <Review />
    </MemoryRouter>,
  );
  expect(screen.getByRole("tab", { name: "知識" })).toHaveAttribute(
    "title",
    "Ctrl+1",
  );
  await user.type(screen.getByRole("textbox", { name: "知識の状態" }), "保持");
  await user.click(screen.getByRole("tab", { name: "クイズ" }));
  expect(screen.getByText("個人の日替わりクイズ")).toBeVisible();
  await user.click(screen.getByRole("tab", { name: "知識" }));
  expect(screen.getByRole("textbox", { name: "知識の状態" })).toHaveValue(
    "初期値保持",
  );
});

it("Planの対象を知識・クイズで共有し、日替わりにも戻れる", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/review"]}>
      <ReviewHeaderTabs />
      <Review />
    </MemoryRouter>,
  );
  await user.selectOptions(screen.getByLabelText("復習対象"), "plan:plan-1");
  expect(screen.getByRole("textbox", { name: "知識の状態" })).toHaveAttribute(
    "data-profile",
    "plan:plan-1",
  );
  await user.type(screen.getByLabelText("知識の状態"), "保持");
  await user.click(screen.getByRole("tab", { name: "クイズ" }));
  expect(screen.getByText("計画の準備済みクイズ")).toHaveAttribute(
    "data-plan",
    "plan-1",
  );
  await user.click(screen.getByRole("tab", { name: "知識" }));
  expect(screen.getByLabelText("知識の状態")).toHaveValue("初期値保持");
  await user.selectOptions(screen.getByLabelText("復習対象"), "default");
  expect(screen.getByLabelText("知識の状態")).toHaveAttribute(
    "data-profile",
    "default",
  );
});

it("リソース一覧のリンクから既存Planを選んで知識復習を開始する", () => {
  render(
    <MemoryRouter initialEntries={["/review?resource=resource-1"]}>
      <Review />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText("知識の状態")).toHaveAttribute(
    "data-profile",
    "plan:plan-1",
  );
  expect(screen.getByText("対象リソースのLv・XP")).toBeVisible();
});

it("計画の復習から同じ選択欄で過去の日替わりへ戻れる", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/review?resource=resource-1&view=quiz"]}>
      <ReviewHeaderTabs />
      <Review />
    </MemoryRouter>,
  );
  expect(screen.getByText("計画の準備済みクイズ")).toBeVisible();
  const target = screen.getByLabelText("復習対象");
  expect(
    screen.getByRole("group", { name: "復習対象と設定" }),
  ).toContainElement(target);
  expect(target.closest("section")).toBeNull();
  const days = target.querySelectorAll<HTMLOptionElement>(
    'option[value^="day:"]',
  );
  await user.selectOptions(target, days[1].value);
  expect(screen.getByText("個人の日替わりクイズ")).toHaveAttribute(
    "data-day",
    days[1].value.slice(4),
  );
  expect(screen.queryByText("計画の準備済みクイズ")).toBeNull();
});

it("存在しないPlanや対象Resourceで全リソースの復習を始めない", () => {
  render(
    <MemoryRouter initialEntries={["/review?plan=missing"]}>
      <Review />
    </MemoryRouter>,
  );
  expect(screen.getByRole("alert")).toBeVisible();
  expect(screen.queryByLabelText("知識の状態")).not.toBeInTheDocument();
});

it("学習計画から来たときはその計画の準備済みクイズを表示する", () => {
  render(
    <MemoryRouter initialEntries={["/review?view=quiz&plan=plan-1"]}>
      <Review />
    </MemoryRouter>,
  );
  expect(screen.getByText("計画の準備済みクイズ")).toBeVisible();
  expect(screen.queryByText("個人の日替わりクイズ")).not.toBeInTheDocument();
});
