import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SWRConfig } from "swr";
import { expect, it, vi } from "vitest";
import {
  answerQuiz,
  listQuizFeed,
  searchCreatedQuizzes,
} from "~/features/quiz/api";
import QuizTimeline from "./QuizTimeline";

vi.mock("~/features/quiz/api", () => ({
  answerQuiz: vi.fn(),
  listQuizFeed: vi.fn(),
  searchCreatedQuizzes: vi.fn(),
}));

function renderTimeline() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <MemoryRouter>
        <QuizTimeline />
      </MemoryRouter>
    </SWRConfig>,
  );
}

it("全ユーザー版では専用feedを取得する", async () => {
  vi.mocked(listQuizFeed).mockResolvedValue({
    total: 1,
    data: [
      {
        quiz: {
          quiz_id: "global-quiz",
          quiz_type: "term2sent",
          prompt: {
            subject: "みんなの問題",
            answer_kind: "sentence",
          },
          statement: "みんなの問題",
          options: {},
          correct: [],
          created: "2026-10-04T00:00:00Z",
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
    <SWRConfig value={{ provider: () => new Map() }}>
      <MemoryRouter>
        <QuizTimeline scope="global" />
      </MemoryRouter>
    </SWRConfig>,
  );

  expect(await screen.findByText("みんなの問題")).toBeVisible();
  expect(listQuizFeed).toHaveBeenCalledOnce();
  expect(searchCreatedQuizzes).not.toHaveBeenCalled();
});

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

  renderTimeline();

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

  renderTimeline();
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

it("一部のクイズ形式が壊れていても取得できた形式を表示する", async () => {
  vi.mocked(searchCreatedQuizzes).mockImplementation(async (params) => {
    if (params.quiz_types?.includes("term2sent")) {
      throw new Error("クイズ対象が用語を持たない");
    }
    if (!params.quiz_types?.includes("pair2rel")) {
      return { total: 0, data: [] };
    }
    return {
      total: 1,
      data: [
        {
          quiz: {
            quiz_id: "relation-quiz",
            quiz_type: "pair2rel",
            prompt: {
              subject: "Aの文",
              object: "Bの文",
              relations: [],
              answer_kind: "relation",
            },
            statement: "関係を答える",
            options: { option: "詳細" },
            correct: ["option"],
            created: "2026-09-28T00:00:00Z",
            no_correct_option: false,
          },
          attempts: 0,
          corrects: 0,
          accuracy: null,
          last_attempted_at: null,
        },
      ],
    };
  });

  renderTimeline();

  expect(await screen.findByText("Aの文")).toBeVisible();
  expect(screen.queryByRole("alert")).toBeNull();
});
