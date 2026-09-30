import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import { answerQuiz, searchCreatedQuizzes } from "~/features/quiz/api";
import QuizTimeline from "./QuizTimeline";

vi.mock("~/features/quiz/api", () => ({
  answerQuiz: vi.fn(),
  searchCreatedQuizzes: vi.fn(),
}));

it("未回答のクイズを回答済みのクイズより先に表示する", async () => {
  vi.mocked(searchCreatedQuizzes).mockResolvedValue({
    total: 2,
    data: [
      {
        quiz: {
          quiz_id: "answered",
          quiz_type: "term2sent",
          prompt: {
            subject: "回答済みの問題",
            answer_kind: "sentence",
          },
          statement: "回答済みの問題",
          options: { "option-1": "回答候補" },
          correct: ["option-1"],
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
          quiz_type: "term2sent",
          prompt: {
            subject: "未回答の問題",
            answer_kind: "sentence",
          },
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
  const timelineItems = document.querySelectorAll("[data-hotkey-item]");
  expect(timelineItems).toHaveLength(2);
  expect(timelineItems[0]).toHaveTextContent("未回答の問題");
  expect(timelineItems[1]).toHaveTextContent("回答済みの問題");
  expect(
    screen.queryByRole("button", { name: "回答候補" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "クイズを解く" }),
  ).not.toBeInTheDocument();
});

it("クイズTL上で回答して結果を確認できる", async () => {
  const quiz = {
    quiz_id: "quiz-1",
    quiz_type: "term2sent" as const,
    prompt: {
      subject: "その場で解く問題",
      answer_kind: "sentence" as const,
    },
    statement: "その場で解く問題",
    options: { "option-1": "正しい選択肢" },
    correct: ["option-1"],
    created: "2026-09-28T00:00:00Z",
    no_correct_option: false,
  };
  vi.mocked(searchCreatedQuizzes).mockResolvedValue({
    total: 1,
    data: [
      {
        quiz,
        attempts: 0,
        corrects: 0,
        accuracy: null,
        last_attempted_at: null,
      },
    ],
  });
  vi.mocked(answerQuiz).mockResolvedValue({
    sentences: [],
    links: [],
    quizzes: [
      { quiz_id: quiz.quiz_id, quiz_type: "term2sent", readable: quiz },
    ],
    answers: [
      {
        answer_uid: "answer-1",
        quiz_uid: quiz.quiz_id,
        selected: ["option-1"],
        who: "user-1",
        is_correct: true,
        created: "2026-09-28T01:00:00Z",
      },
    ],
  });
  const user = userEvent.setup();

  render(
    <MemoryRouter>
      <QuizTimeline />
    </MemoryRouter>,
  );
  expect(
    screen.queryByRole("button", { name: "正しい選択肢" }),
  ).not.toBeInTheDocument();
  await user.click(
    await screen.findByRole("button", { name: /その場で解く問題/ }),
  );
  await user.click(screen.getByRole("button", { name: "正しい選択肢" }));
  await user.click(screen.getByRole("button", { name: "回答する" }));

  expect(answerQuiz).toHaveBeenCalledWith("quiz-1", ["option-1"]);
  expect(await screen.findByText("正解です")).toBeInTheDocument();
  expect(screen.getByText("今回 正解")).toBeInTheDocument();
});
