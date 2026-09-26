import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NameSpace } from "~/shared/generated/fastAPI.schemas";
import { LearningLevel, LearningSummary } from ".";

const learningProgress = {
  activity: {},
  xp: { knowledge: 12, quiz_creation: 3, quiz_answer: 25, correct_bonus: 4 },
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
  it("現在のレベルと次のレベルまでのXPを表示する", () => {
    render(<LearningLevel progress={learningProgress} />);

    expect(screen.getByText("Lv. 1")).toBeInTheDocument();
    expect(screen.getByText("44 XP")).toBeInTheDocument();
    expect(screen.getByText("次のレベルまで 6 XP")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "レベル進捗 88%",
    );
  });
});
