import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import QuizReportButton from "./QuizReportButton";
import { reportQuizIssue } from "./api";

vi.mock("./api", () => ({ reportQuizIssue: vi.fn() }));

it("不備の分類と詳細を報告する", async () => {
  const user = userEvent.setup();
  vi.mocked(reportQuizIssue).mockResolvedValue();
  render(<QuizReportButton quizId="quiz-1" />);

  await user.click(screen.getByRole("button", { name: "不備を報告" }));
  await user.selectOptions(screen.getByLabelText("不備の種類"), "incorrect");
  await user.type(screen.getByLabelText("詳細（任意）"), "正解がおかしい");
  await user.click(screen.getByRole("button", { name: "報告する" }));

  expect(reportQuizIssue).toHaveBeenCalledWith(
    "quiz-1",
    "incorrect",
    "正解がおかしい",
  );
});
