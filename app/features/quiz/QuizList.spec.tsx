import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import QuizList from "./QuizList";

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

const resourceStatus = {
  resource: {
    uid: "resource-1",
    name: "代数学ノート",
  },
  total_quizzes: 1,
  quiz_counts: { term2sent: 1 },
  last_created_at: "2026-07-28T00:00:00Z",
};

const server = setupServer(
  http.get("*/quiz/created/resources", () =>
    HttpResponse.json([resourceStatus]),
  ),
  http.get("*/quiz/created", () =>
    HttpResponse.json({ data: [quiz], total: 1 }),
  ),
  http.delete("*/quiz/quiz-1", () => new HttpResponse(null, { status: 204 })),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("作成したQuizを確認して削除する", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <QuizList />
    </MemoryRouter>,
  );

  expect(await screen.findByText("代数学ノート")).toBeInTheDocument();
  expect(screen.getByText("用語→単文 1")).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "クイズを見る" }));

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
