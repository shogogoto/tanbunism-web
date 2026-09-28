import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { searchCreatedQuizzes } from "~/features/quiz/api";
import QuizTimeline from "./QuizTimeline";

vi.mock("~/features/quiz/api", () => ({ searchCreatedQuizzes: vi.fn() }));

it("未回答のクイズを回答済みのクイズより先に表示する", async () => {
  vi.mocked(searchCreatedQuizzes).mockResolvedValue({
    total: 2,
    data: [
      {
        quiz: {
          quiz_id: "answered",
          statement: "回答済みの問題",
          options: {},
          correct: [],
          created: "2026-09-28T00:00:00Z",
          no_correct_option: false,
        },
        attempts: 2,
        corrects: 1,
        accuracy: 0.5,
        last_attempted_at: "2026-09-28T01:00:00Z",
      },
      {
        quiz: {
          quiz_id: "unanswered",
          statement: "未回答の問題",
          options: {},
          correct: [],
          created: "2026-09-27T00:00:00Z",
          no_correct_option: false,
        },
        attempts: 0,
        corrects: 0,
        accuracy: null,
        last_attempted_at: null,
      },
    ],
  });

  render(
    <MemoryRouter>
      <QuizTimeline />
    </MemoryRouter>,
  );

  const unanswered = await screen.findByText("未回答の問題");
  const answered = screen.getByText("回答済みの問題");
  expect(
    unanswered.compareDocumentPosition(answered) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.getByText("未回答")).toBeInTheDocument();
});
