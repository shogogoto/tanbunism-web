import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import QuizPreviewPrompt from "./QuizPreviewPrompt";
import type { ReadableQuiz } from "./api";

const { openPreview } = vi.hoisted(() => ({ openPreview: vi.fn() }));
vi.mock("~/features/tanbun/detail/Preview", () => ({
  useTanbunPreview: () => ({ openPreview, preview: null }),
}));
const quiz: ReadableQuiz = {
  quiz_id: "quiz",
  quiz_type: "pair2rel",
  prompt: { subject: "単文A", object: "単文B", answer_kind: "relation" },
  statement: "問題",
  options: { yes: "参照" },
  correct: ["yes"],
  created: "2026-10-09",
  no_correct_option: false,
};

it("opens A and B using their existing quiz-chain roles", async () => {
  render(<QuizPreviewPrompt quiz={quiz} showCorrectAnswer />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "単文A" }));
  expect(openPreview).toHaveBeenLastCalledWith({
    quizId: "quiz",
    role: "target",
    sentence: undefined,
  });
  await user.click(screen.getByRole("button", { name: "単文B" }));
  expect(openPreview).toHaveBeenLastCalledWith({
    quizId: "quiz",
    role: "correct",
    sentence: "単文B",
  });
  expect(
    screen.queryByRole("button", { name: "参照" }),
  ).not.toBeInTheDocument();
});

it("opens the correct sentence for sentence-answer quizzes", async () => {
  render(
    <QuizPreviewPrompt
      quiz={{
        ...quiz,
        quiz_type: "term2sent",
        prompt: { subject: "用語", answer_kind: "sentence" },
        options: { yes: "正解の単文" },
      }}
      showCorrectAnswer
    />,
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "正解の単文" }));
  expect(openPreview).toHaveBeenLastCalledWith({
    quizId: "quiz",
    role: "correct",
    sentence: "正解の単文",
  });
});
