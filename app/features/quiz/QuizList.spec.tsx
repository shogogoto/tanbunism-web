import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import QuizList, { formatCompactQuizDate } from "./QuizList";
import ResourceLearningOverview from "./ResourceLearningOverview";
import { emptyQuizFilters } from "./quizFilters";

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
  http.get("*/quiz/created/broken", () =>
    HttpResponse.json([
      {
        quiz_id: "broken-quiz-1",
        quiz_type: "term2sent",
        retired_sentence_id: "retired-1",
        retired_value: "退役した単文",
        resource_id: "resource-1",
        resource_name: "代数学ノート",
        roles: ["QUIZ_TARGET"],
        retired_at: "2026-09-30T00:00:00Z",
      },
    ]),
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
  http.post("*/quiz/created/delete", () =>
    HttpResponse.json({
      deleted_count: 1,
      deleted_answer_count: 0,
      skipped_count: 0,
    }),
  ),
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

it("作成したQuizを確認して削除する", async () => {
  const user = userEvent.setup();
  renderQuizList("/quiz/list?resource=resource-1");

  expect(await screen.findByText(quiz.statement)).toBeInTheDocument();
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

it("選択したQuizを一括削除する", async () => {
  const user = userEvent.setup();
  renderQuizList("/quiz/list?resource=resource-1");

  await user.click(
    await screen.findByRole("checkbox", {
      name: `クイズを選択: ${quiz.statement}`,
    }),
  );
  await user.click(screen.getByRole("button", { name: "1件を削除" }));
  await user.click(screen.getByRole("button", { name: "まとめて削除する" }));

  expect(
    await screen.findByText("このResourceから作成したクイズはありません。"),
  ).toBeInTheDocument();
});

it("Resourceを指定した画面ではクイズを絞り込める", async () => {
  const user = userEvent.setup();
  renderQuizList("/quiz/list?resource=resource-1");

  expect(await screen.findByText(quiz.statement)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "クイズを絞り込む" }));
  await user.type(screen.getByLabelText("検索文字列"), "可換");
  await user.selectOptions(screen.getByLabelText("回答状態"), "true");
  await user.click(screen.getByRole("checkbox", { name: "用語→単文" }));
  await waitFor(() => {
    const request = new URL(searchRequests.at(-1) ?? "https://example.com");
    expect(request.searchParams.get("q")).toBe("可換");
    expect(request.searchParams.get("answered")).toBe("true");
    expect(request.searchParams.get("quiz_types")).toBe("term2sent");
  });
});

it("Resourceごとの学習指標を表示する", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ResourceLearningOverview filters={emptyQuizFilters} />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Coverage")).toBeVisible();
  expect(screen.getByText("未着手ノート")).toBeInTheDocument();
  expect(screen.getByText("Attempt")).toBeVisible();
  expect(screen.getByText("Accuracy")).toBeVisible();
  expect(screen.getAllByText("50%")).toHaveLength(2);
  expect(screen.getAllByText("100%")).toHaveLength(1);
  expect(screen.getByText("0問")).toBeInTheDocument();
  const coverageHeader = screen.getByRole("button", {
    name: "Coverageの説明",
  });
  expect(coverageHeader.parentElement).toHaveClass("sticky");
  await user.click(coverageHeader);
  expect(screen.getByText(/対象単文のうち、必要な形式のクイズ/)).toBeVisible();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button", { name: /参照切れ 1件/ })).toBeVisible();
  await user.click(screen.getByRole("button", { name: /参照切れ 1件/ }));
  expect(screen.getByRole("heading", { name: "参照切れクイズ" })).toBeVisible();
  await user.keyboard("{Escape}");
  await user.click(screen.getByRole("button", { name: /代数学ノート/ }));
  expect(await screen.findByText(quiz.statement)).toBeInTheDocument();
});

it("Resource一覧の先頭で指定した条件を開いたResourceへ適用する", async () => {
  const user = userEvent.setup();
  renderQuizList();

  await screen.findByText("Resource別の学習状況");
  await user.click(screen.getByRole("button", { name: "クイズを絞り込む" }));
  await user.click(screen.getByRole("checkbox", { name: "用語→単文" }));
  await user.click(screen.getByRole("button", { name: /代数学ノート/ }));

  await waitFor(() =>
    expect(
      searchRequests.some((url) => {
        const request = new URL(url);
        return (
          request.searchParams.get("resource_id") === "resource-1" &&
          request.searchParams.get("quiz_types") === "term2sent"
        );
      }),
    ).toBe(true),
  );
});
