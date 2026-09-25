import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import { monthlyQuizAchievementFixture } from "~/features/achievement/fixture";
import DashboardAchievement from "./DashboardAchievement";

const server = setupServer(
  http.get("*/user/achievement/quiz/monthly", () =>
    HttpResponse.json(monthlyQuizAchievementFixture()),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("今月の学習量をダッシュボードから確認できる", async () => {
  render(
    <MemoryRouter>
      <DashboardAchievement />
    </MemoryRouter>,
  );

  expect(await screen.findByText("75%")).toBeVisible();
  expect(screen.getByText("クイズ作成")).toBeVisible();
  expect(screen.getByText("クイズ回答")).toBeVisible();
  expect(screen.getByRole("link", { name: "月間記録を見る" })).toHaveAttribute(
    "href",
    "/achievement",
  );
});
