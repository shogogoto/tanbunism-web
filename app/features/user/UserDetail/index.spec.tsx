import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { NameSpace } from "~/shared/generated/fastAPI.schemas";
import UserDetail, { LearningLevel, LearningSummary } from ".";
import { growthFixture, shelfFixture } from "./ResourceShelf.fixture";

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: undefined }),
}));
vi.mock("~/features/gamification/ResourceGrowth", () => ({
  useResourceGrowth: () => ({
    data: growthFixture,
    isLoading: false,
    mutate: vi.fn(),
  }),
}));
vi.mock("../UserProfile", () => ({ default: () => null }));

const learningProgress = {
  activity: { n_tanbun_exposure: 2 },
  xp: {
    knowledge: 0,
    quiz_creation: 0,
    quiz_answer: 25,
    correct_bonus: 4,
    tanbun_exposure: 2,
  },
  xp_details: [
    {
      source: "quiz_answer" as const,
      activity_count: 5,
      xp_per_activity: 5,
      earned_xp: 25,
    },
    {
      source: "correct_bonus" as const,
      activity_count: 2,
      xp_per_activity: 2,
      earned_xp: 4,
    },
    {
      source: "tanbun_exposure" as const,
      activity_count: 2,
      xp_per_activity: 1,
      earned_xp: 2,
    },
  ],
  total_xp: 31,
  level: 3,
  current_level_xp: 1,
  xp_for_next_level: 30,
  xp_to_next_level: 29,
  level_xp_coefficient: 10,
};

it("Powerと今日のXPだけを簡潔に表示し、累計XPとは区別する", () => {
  render(
    <MemoryRouter>
      <UserDetail
        user={undefined}
        namespace={shelfFixture}
        learningProgress={{ ...learningProgress, today_xp: 7 }}
      />
    </MemoryRouter>,
  );
  const stats = within(
    screen.getByRole("region", { name: "プロフィールのステータス" }),
  );
  expect(stats.getByText("Power").nextSibling).toHaveTextContent("360");
  expect(stats.getByText("今日のXP").nextSibling).toHaveTextContent("7");
  expect(stats.getByRole("progressbar")).toHaveAttribute(
    "aria-valuetext",
    "1 / 30 XP · 今日 +7 XP",
  );
  expect(
    stats.getByRole("progressbar").querySelector('[data-xp-segment="today"]'),
  ).toHaveClass("bg-emerald-500");
  expect(screen.queryByText("本棚のPower")).not.toBeInTheDocument();
  expect(screen.queryByText("記録開始後の合計")).not.toBeInTheDocument();
  expect(screen.queryByText("論理・参照の整理")).not.toBeInTheDocument();
});

describe("LearningSummary", () => {
  it("公開Resourceの統計をユーザー単位で集計する", () => {
    const namespace = {
      stats: {
        resource1: {
          n_char: 1200,
          n_sentence: 12,
          n_term: 4,
        },
        resource2: {
          n_char: 3456,
          n_sentence: 34,
          n_term: 10,
        },
      },
    } as unknown as NameSpace;

    render(<LearningSummary namespace={namespace} />);

    expect(screen.getByText("Resources").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("単文").nextSibling).toHaveTextContent("46");
    expect(screen.getByText("用語").nextSibling).toHaveTextContent("14");
    expect(screen.getByText("文字").nextSibling).toHaveTextContent("4,656");
  });
});

describe("LearningLevel", () => {
  it("現在のレベルと次のレベルまでのXPを表示する", async () => {
    const user = userEvent.setup();
    render(<LearningLevel progress={learningProgress} />);

    expect(screen.getByText("Lv. 3")).toBeInTheDocument();
    expect(screen.getByText("累計 31 XP")).toBeInTheDocument();
    expect(screen.getByText("次のレベルまで 29 XP")).toBeInTheDocument();
    expect(screen.getByText("Lv. 3：累計 30 XP以上")).toBeInTheDocument();
    expect(screen.getByText("Lv. 4：累計 60 XP")).toBeInTheDocument();
    expect(
      screen.getByText("次のLvに必要なXP：Lv. 3 × 10 = 30 XP"),
    ).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "レベル進捗 3.3333333333333335%",
    );

    await user.click(
      screen.getByRole("button", { name: "XPの加点ルールと獲得内訳" }),
    );
    expect(screen.queryByText("知識の整理")).not.toBeInTheDocument();
    expect(screen.queryByText("クイズ作成")).not.toBeInTheDocument();
    expect(screen.getByText("+25 XP")).toBeVisible();
    expect(screen.getByText("見たよ")).toBeVisible();
  });
});
