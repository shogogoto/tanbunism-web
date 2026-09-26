import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import QuizList, { formatCompactQuizDate } from "./QuizList";

vi.mock("~/shared/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const quiz = {
  quiz_id: "quiz-1",
  statement: "「可換」に合う文を当ててください",
  options: {
    "sentence-1": "演算の順序を交換しても結果が変わらない性質",
    "sentence-2": "演算しても相手を変化させない元",
  },
  correct: ["sentence-1"],
  created: "2026-07-28T00:00:00Z",
  no_correct_option: false,
};
const managedQuiz = {
  quiz,
  attempts: 1,
  corrects: 1,
  accuracy: 1,
  last_attempted_at: "2026-07-28T01:00:00Z",
};

const resourceStatus = {
  resource: {
    uid: "resource-1",
    name: "代数学ノート",
  },
  total_quizzes: 1,
  quiz_counts: { term2sent: 1 },
  last_created_at: "2026-07-28T00:00:00Z",
};

const learningStatus = {
  resource_id: "resource-1",
  user_id: "user-1",
  by_quiz_type: {
    term2sent: {
      coverage: {
        resource_id: "resource-1",
        user_id: "user-1",
        quiz_type: "term2sent",
        eligible: 4,
        covered: 2,
        ratio: 0.5,
      },
      attempt_rate: {
        resource_id: "resource-1",
        user_id: "user-1",
        quiz_type: "term2sent",
        available: 2,
        attempted: 1,
        ratio: 0.5,
      },
      performance: {
        resource_id: "resource-1",
        user_id: "user-1",
        quiz_type: "term2sent",
        attempts: 1,
        corrects: 1,
        last_attempted_at: "2026-07-28T01:00:00Z",
        accuracy: 1,
      },
    },
  },
  overall_coverage: 0.5,
  overall_attempt_rate: 0.5,
  overall_accuracy: 1,
  last_attempted_at: "2026-07-28T01:00:00Z",
};
const searchRequests: string[] = [];

const server = setupServer(
  http.get("*/namespace", () =>
    HttpResponse.json({
      g: {
        directed: true,
        edges: [],
        graph: {},
        multigraph: false,
        nodes: [
          { id: resourceStatus.resource },
          { id: { uid: "resource-2", name: "未着手ノート" } },
        ],
      },
      roots_: {},
      user_id: "user-1",
      stats: {
        "resource-1": { n_sentence: 4 },
        "resource-2": { n_sentence: 3 },
      },
    }),
  ),
  http.get("*/quiz/created/resources", () =>
    HttpResponse.json([resourceStatus]),
  ),
  http.get("*/quiz/learning-progress/resource-1", () =>
    HttpResponse.json(learningStatus),
  ),
  http.get("*/quiz/learning-progress/resource-2", () =>
    HttpResponse.json({
      ...learningStatus,
      resource_id: "resource-2",
      by_quiz_type: {},
      overall_coverage: 0,
      overall_attempt_rate: 0,
      overall_accuracy: 0,
      last_attempted_at: null,
    }),
  ),
  http.get("*/quiz/created/search", ({ request }) => {
    searchRequests.push(request.url);
    return HttpResponse.json({ data: [managedQuiz], total: 1 });
  }),
  http.delete("*/quiz/quiz-1", () => new HttpResponse(null, { status: 204 })),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  searchRequests.length = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

function renderQuizList(initialEntry = "/quiz/list") {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QuizList />
    </MemoryRouter>,
  );
}

it("作成日時を現在日からの距離に応じて短く表示する", () => {
  const now = new Date(2026, 8, 26, 12);

  expect(formatCompactQuizDate("2026-09-26T12:00:00", now)).toBe("今日");
  expect(formatCompactQuizDate("2026-09-25T12:00:00", now)).toBe("1日前");
  expect(formatCompactQuizDate("2026-09-19T12:00:00", now)).toBe("7日前");
  expect(formatCompactQuizDate("2026-07-28T12:00:00", now)).toBe("7月28日");
  expect(formatCompactQuizDate("2025-07-28T12:00:00", now)).toBe(
    "2025年7月28日",
  );
});

it("Resourceを開いて作成したQuizを確認して削除する", async () => {
  const user = userEvent.setup();
  renderQuizList();

  expect(await screen.findByText("代数学ノート")).toBeInTheDocument();
  expect(screen.queryByText(quiz.statement)).not.toBeInTheDocument();
  expect(searchRequests).toHaveLength(0);

  await user.click(screen.getByRole("button", { name: /代数学ノート/ }));

  expect(await screen.findByText("用語→単文 1")).toBeInTheDocument();
  expect(await screen.findByText(quiz.statement)).toBeInTheDocument();
  expect(searchRequests.at(-1)).toContain("resource_id=resource-1");
  expect(screen.getByText("7月28日")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /作成日時/ })).toHaveAttribute(
    "aria-label",
    expect.stringContaining("2026"),
  );
  await user.click(screen.getByText(quiz.statement));
  expect(screen.getByText("正解")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "削除" }));
  expect(
    screen.getByText(/このクイズに対する回答履歴も削除されます/),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "削除する" }));

  expect(
    await screen.findByText("このResourceから作成したクイズはありません。"),
  ).toBeInTheDocument();
  expect(screen.queryByText(quiz.statement)).not.toBeInTheDocument();
});

it("Resourceを指定した画面ではクイズを絞り込める", async () => {
  const user = userEvent.setup();
  renderQuizList("/quiz/list?resource=resource-1");

  expect(await screen.findByText(quiz.statement)).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("回答状態"), "true");
  await user.click(screen.getByRole("checkbox", { name: "用語→単文" }));
  await waitFor(() =>
    expect(searchRequests.at(-1)).toMatch(
      /answered=true.*quiz_types=term2sent|quiz_types=term2sent.*answered=true/,
    ),
  );
});

it("Resourceごとの学習指標を表示する", async () => {
  renderQuizList();

  expect(await screen.findAllByText("Coverage")).toHaveLength(2);
  expect(screen.getByText("未着手ノート")).toBeInTheDocument();
  expect(screen.getAllByText("Attempt")).toHaveLength(2);
  expect(screen.getAllByText("Accuracy")).toHaveLength(2);
  expect(screen.getAllByText("50%")).toHaveLength(2);
  expect(screen.getAllByText("100%")).toHaveLength(1);
  expect(screen.getByText("0問作成済み")).toBeInTheDocument();
});
