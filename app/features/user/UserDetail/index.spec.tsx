import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { NameSpace } from "~/shared/generated/fastAPI.schemas";
import { LearningLevel, LearningSummary } from ".";

const learningProgress = {
  activity: {},
  xp: { knowledge: 12, quiz_creation: 3, quiz_answer: 25, correct_bonus: 4 },
  xp_details: [
    {
      source: "knowledge" as const,
      activity_count: 12,
      xp_per_activity: 1,
      earned_xp: 12,
    },
    {
      source: "quiz_creation" as const,
      activity_count: 3,
      xp_per_activity: 1,
      earned_xp: 3,
    },
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
  ],
  total_xp: 44,
  level: 1,
  current_level_xp: 44,
  xp_for_next_level: 50,
  xp_to_next_level: 6,
};

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

    expect(screen.getByText("Lv. 1")).toBeInTheDocument();
    expect(screen.getByText("44 XP")).toBeInTheDocument();
    expect(screen.getByText("次のレベルまで 6 XP")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "レベル進捗 88%",
    );

    await user.click(screen.getByRole("button", { name: "XPの内訳" }));
    expect(screen.getByText("知識の整理")).toBeVisible();
    expect(screen.getByText("12文 × 1 XP")).toBeVisible();
    expect(screen.getByText("+25 XP")).toBeVisible();
    expect(screen.getByText(/次のレベルは累計50 XP/)).toBeVisible();
  });
});
