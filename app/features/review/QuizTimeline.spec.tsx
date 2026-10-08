import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SWRConfig } from "swr";
import { expect, it, vi } from "vitest";
import {
  addDailyQuizzes,
  answerQuiz,
  getQuizChain,
  listDailyQuizzes,
} from "~/features/quiz/api";
import { recommendationDay } from "~/shared/lib/recommendationDay";
import { ReviewProgressProvider, useReviewProgress } from "./ReviewProgress";

function Progress({ day = recommendationDay() }: { day?: string }) {
  const progress = useReviewProgress("quiz", "default", day);
  return (
    <output aria-label="クイズ進捗">
      {progress ? `${progress.done}/${progress.total}` : "未取得"}
    </output>
  );
}

import QuizTimeline from "./QuizTimeline";

it("過去セットの回答済みを引き継ぎ、過去への候補追加は出さない", async () => {
  const today = recommendationDay();
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  const day = date.toISOString().slice(0, 10);
  vi.mocked(listDailyQuizzes).mockResolvedValue({
    total: 1,
    data: [
      {
        quiz: {
          quiz_id: "past-quiz",
          quiz_type: "term2sent",
          prompt: { subject: "過去の問題", answer_kind: "sentence" },
          statement: "過去の問題",
          options: { a: "選択肢" },
          correct: ["a"],
          created: day,
          no_correct_option: false,
        },
        attempts: 1,
        corrects: 1,
        accuracy: 1,
        last_attempted_at: day,
        answered_today: false,
        answered_in_set: true,
      },
    ],
  });
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <ReviewProgressProvider>
        <MemoryRouter>
          <Progress day={day} />
          <QuizTimeline selectedDay={day} />
        </MemoryRouter>
      </ReviewProgressProvider>
    </SWRConfig>,
  );
  expect(await screen.findByText("過去の問題")).toBeVisible();
  expect(listDailyQuizzes).toHaveBeenCalledWith(
    true,
    undefined,
    "default",
    day,
  );
  expect(screen.queryByText(`${day}のセット`)).not.toBeInTheDocument();
  expect(screen.getByLabelText("クイズ進捗")).toHaveTextContent("1/1");
  expect(
    screen.queryByRole("button", { name: "回答する" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "もう少し復習する" }),
  ).not.toBeInTheDocument();
});

vi.mock("~/features/quiz/api", () => ({
  answerQuiz: vi.fn(),
  listDailyQuizzes: vi.fn(),
  addDailyQuizzes: vi.fn(),
  getQuizChain: vi.fn(),
}));
vi.mock("~/features/tanbun/detail/index", () => ({
  default: () => <div>単文のプレビュー本文</div>,
}));

it("問題の単文を覗いて閉じても選択肢と現在地を維持する", async () => {
  const user = userEvent.setup();
  vi.mocked(listDailyQuizzes).mockResolvedValue({
    total: 1,
    data: [
      {
        quiz: {
          quiz_id: "preview-quiz",
          quiz_type: "sent2term",
          prompt: { subject: "対象の単文", answer_kind: "term" },
          statement: "対象の単文",
          options: { a: "選択肢A", b: "選択肢B" },
          correct: ["a"],
          created: "2026-10-06T00:00:00Z",
          no_correct_option: false,
        },
        attempts: 0,
        corrects: 0,
        accuracy: null,
        last_attempted_at: null,
      },
    ],
  });
  vi.mocked(getQuizChain).mockResolvedValue({
    sentences: [],
    quizzes: [],
    links: [
      { quiz_id: "preview-quiz", sentence_id: "sentence-1", role: "target" },
    ],
  });
  renderTimeline();
  await user.click(await screen.findByRole("button", { name: "選択肢A" }));
  await user.click(screen.getByRole("button", { name: "対象の単文" }));
  expect(await screen.findByText("単文のプレビュー本文")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "閉じる" }));
  expect(screen.getByRole("button", { name: "選択肢A" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "1問目を表示" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  expect(answerQuiz).not.toHaveBeenCalled();
});

function renderTimeline() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <ReviewProgressProvider>
        <MemoryRouter>
          <Progress />
          <QuizTimeline />
        </MemoryRouter>
      </ReviewProgressProvider>
    </SWRConfig>,
  );
}

it("消化後の追加復習では新しく追加した問題へ移動する", async () => {
  const user = userEvent.setup();
  const first = {
    quiz: {
      quiz_id: "first",
      quiz_type: "term2sent" as const,
      prompt: { subject: "最初の問題", answer_kind: "sentence" as const },
      statement: "最初の問題",
      options: {},
      correct: [],
      created: "2026-10-06T00:00:00Z",
      no_correct_option: false,
    },
    attempts: 1,
    corrects: 1,
    accuracy: 1,
    last_attempted_at: null,
    answered_today: true,
  };
  const next = {
    ...first,
    quiz: {
      ...first.quiz,
      quiz_id: "next",
      prompt: { ...first.quiz.prompt, subject: "追加の問題" },
    },
    answered_today: false,
  };
  vi.mocked(listDailyQuizzes).mockResolvedValue({ total: 1, data: [first] });
  vi.mocked(addDailyQuizzes).mockResolvedValue({
    total: 2,
    data: [first, next],
  });
  renderTimeline();
  await user.click(
    await screen.findByRole("button", { name: "もう少し復習する" }),
  );
  expect(await screen.findByText("追加の問題")).toBeVisible();
  expect(screen.getByText("最初の問題")).not.toBeVisible();
  expect(addDailyQuizzes).toHaveBeenCalledWith("default");
});

it("全ユーザー版では専用feedを取得する", async () => {
  vi.mocked(listDailyQuizzes).mockResolvedValue({
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
      <ReviewProgressProvider>
        <MemoryRouter>
          <Progress />
          <QuizTimeline scope="global" />
        </MemoryRouter>
      </ReviewProgressProvider>
    </SWRConfig>,
  );

  expect(await screen.findByText("みんなの問題")).toBeVisible();
  expect(listDailyQuizzes).toHaveBeenCalledWith(
    false,
    undefined,
    "default",
    recommendationDay(),
  );
});

it("日替わりセットの順序を維持し1問ずつ表示する", async () => {
  const user = userEvent.setup();
  vi.mocked(listDailyQuizzes).mockResolvedValue({
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
    answered.compareDocumentPosition(unanswered) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(answered).toBeVisible();
  expect(unanswered).not.toBeVisible();
  expect(screen.getByText("復習 50%")).toBeVisible();
  const accuracy = screen.getByText("正答率 50%");
  expect(accuracy.parentElement?.parentElement).toContainElement(
    screen.getByRole("button", { name: "不備を報告" }),
  );
  const timelineItems = document.querySelectorAll("[data-hotkey-item]");
  expect(timelineItems).toHaveLength(1);
  expect(timelineItems[0]).toHaveTextContent("回答済みの問題");
  expect(screen.getByRole("button", { name: "回答候補" })).toBeVisible();
  expect(screen.getByText("1 / 2")).toBeVisible();

  fireEvent.touchStart(answered, {
    touches: [{ clientX: 200, clientY: 300 }],
  });
  fireEvent.touchMove(answered, {
    touches: [{ clientX: 200, clientY: 150 }],
  });
  fireEvent.touchEnd(answered, {
    changedTouches: [{ clientX: 200, clientY: 150 }],
  });
  expect(answered).toBeVisible();
  expect(unanswered).not.toBeVisible();
  expect(screen.getByText("1 / 2")).toBeVisible();
  expect(
    screen.getByRole("navigation", { name: "下部のクイズ移動" }),
  ).toHaveClass("sm:hidden", "fixed", "bottom-[var(--app-footer-height,5rem)]");
  expect(screen.getByRole("button", { name: "前の問題" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "次の問題" }));
  expect(unanswered).toBeVisible();
  expect(screen.getByRole("button", { name: "次の問題" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "前の問題" }));
  expect(answered).toBeVisible();
  await user.click(screen.getByRole("button", { name: "次のクイズ" }));

  expect(unanswered).toBeVisible();
  expect(answered).not.toBeVisible();
  expect(screen.getByText("2 / 2")).toBeVisible();
  expect(
    screen.queryByRole("link", { name: "クイズを解く" }),
  ).not.toBeInTheDocument();
});

it("サーバーが選んだ復習候補を並び替えず表示する", async () => {
  const managed = (id: string, accuracy: number, attemptedAt: string) => ({
    quiz: {
      quiz_id: id,
      quiz_type: "term2sent" as const,
      prompt: { subject: `${id}の問題`, answer_kind: "sentence" as const },
      statement: `${id}の問題`,
      options: {},
      correct: [],
      created: attemptedAt,
      no_correct_option: false,
    },
    attempts: 2,
    corrects: Math.round(accuracy * 2),
    accuracy,
    last_attempted_at: attemptedAt,
  });
  vi.mocked(listDailyQuizzes).mockResolvedValue({
    total: 2,
    data: [
      managed("復習対象", 0.5, "2026-10-03T01:00:00Z"),
      managed("正解済み", 1, "2026-10-04T01:00:00Z"),
    ],
  });

  renderTimeline();

  const review = await screen.findByText("復習対象の問題");
  const mastered = screen.getByText("正解済みの問題");
  expect(
    review.compareDocumentPosition(mastered) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(review).toBeVisible();
  expect(mastered).not.toBeVisible();
  expect(screen.getByText("復習 50%")).toBeVisible();
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
  vi.mocked(listDailyQuizzes).mockResolvedValue({
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
  await user.click(await screen.findByRole("button", { name: "正しい選択肢" }));
  await user.click(screen.getByRole("button", { name: "回答する" }));

  expect(answerQuiz).toHaveBeenCalledWith("quiz-1", ["option-1"]);
  expect(await screen.findByText("正解です")).toBeInTheDocument();
  expect(screen.getByText("今回 正解")).toBeInTheDocument();
  expect(screen.getByLabelText("クイズ進捗")).toHaveTextContent("1/1");
});

it("再訪しても今日の回答済み件数を表示する", async () => {
  vi.mocked(listDailyQuizzes).mockImplementation(async () => {
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
          answered_today: true,
        },
      ],
    };
  });

  renderTimeline();

  expect(await screen.findByText("Aの文")).toBeVisible();
  expect(screen.getByLabelText("クイズ進捗")).toHaveTextContent("1/1");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "回答する" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "1問目を表示" })).toHaveAttribute(
    "title",
    "回答済み",
  );
  const answeredDot = screen
    .getByRole("button", { name: "1問目を表示" })
    .querySelector("span");
  expect(answeredDot).toHaveClass("bg-emerald-500", "ring-2");
  expect(answeredDot).not.toHaveClass("bg-primary", "bg-muted-foreground/35");
  await userEvent.click(screen.getByRole("button", { name: "もう一度解く" }));
  expect(screen.getByRole("button", { name: "回答する" })).toBeInTheDocument();
});
