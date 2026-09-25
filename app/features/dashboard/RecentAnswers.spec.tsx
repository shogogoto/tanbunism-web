import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { listAnswerHistory } from "~/features/quiz/api";
import RecentAnswers from "./RecentAnswers";

vi.mock("~/features/quiz/api", () => ({ listAnswerHistory: vi.fn() }));

it("ダッシュボードに最近の回答と回答履歴への導線を表示する", async () => {
  vi.mocked(listAnswerHistory).mockResolvedValue({
    total: 1,
    data: [
      {
        answer: {
          answer_uid: "answer-1",
          quiz_uid: "quiz-1",
          selected: [],
          who: "user-1",
          is_correct: false,
          created: "2026-09-26T00:00:00Z",
        },
        quiz_type: "term2sent",
        resource_id: "resource-1",
        quiz: {
          quiz_id: "quiz-1",
          statement: "復習する問題",
          options: {},
          correct: [],
          created: "2026-09-25T00:00:00Z",
          no_correct_option: false,
        },
      },
    ],
  });

  render(
    <MemoryRouter>
      <RecentAnswers />
    </MemoryRouter>,
  );

  expect(await screen.findByText("復習する問題")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "すべて見る" })).toHaveAttribute(
    "href",
    "/answers",
  );
});
