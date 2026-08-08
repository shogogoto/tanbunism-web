import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import QuizAchievement from ".";
import { monthlyQuizAchievementFixture } from "./fixture";

const requestedMonths: string[] = [];
const server = setupServer(
  http.get("*/user/achievement/quiz/monthly", ({ request }) => {
    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));
    requestedMonths.push(`${year}-${month}`);
    return HttpResponse.json(monthlyQuizAchievementFixture(year, month));
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  requestedMonths.length = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

it("月間のクイズ作業量を集計してグラフに表示する", async () => {
  render(<QuizAchievement initialMonth={{ year: 2026, month: 8 }} />);

  expect(await screen.findByText("作業")).toBeInTheDocument();
  expect(screen.getByText("16")).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: "2026年8月の日別クイズ作業数" }),
  ).toBeInTheDocument();
  expect(screen.getByText("クイズ作成")).toBeInTheDocument();
  expect(screen.getByText("クイズ回答")).toBeInTheDocument();
  expect(screen.getAllByText("正解")).not.toHaveLength(0);
  expect(requestedMonths).toEqual(["2026-8"]);
});

it("前月の学習記録へ移動する", async () => {
  const user = userEvent.setup();
  render(<QuizAchievement initialMonth={{ year: 2026, month: 8 }} />);
  await screen.findByText("2026年8月");

  await user.click(screen.getByRole("button", { name: "前の月" }));

  expect(await screen.findByText("2026年7月")).toBeInTheDocument();
  expect(requestedMonths).toEqual(["2026-8", "2026-7"]);
});

it("活動がない月を空のグラフとして表示する", async () => {
  server.use(
    http.get("*/user/achievement/quiz/monthly", () =>
      HttpResponse.json({
        ...monthlyQuizAchievementFixture(2026, 8),
        days: monthlyQuizAchievementFixture(2026, 8).days.map((day) => ({
          ...day,
          n_quiz_created: 0,
          n_quiz_answered: 0,
          n_quiz_correct: 0,
          n_work: 0,
        })),
        total: {
          n_quiz_created: 0,
          n_quiz_answered: 0,
          n_quiz_correct: 0,
          n_work: 0,
        },
      }),
    ),
  );

  render(<QuizAchievement initialMonth={{ year: 2026, month: 8 }} />);

  expect(
    await screen.findByText("この月にはまだクイズの作業記録がありません。"),
  ).toBeInTheDocument();
});
