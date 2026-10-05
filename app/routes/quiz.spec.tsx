import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import QuizRedirect from "./quiz";

function Location() {
  const location = useLocation();
  return (
    <output>
      {location.pathname}
      {location.search}
    </output>
  );
}

it("旧クイズURLをクイズ検索へ移す", () => {
  render(
    <MemoryRouter initialEntries={["/quiz"]}>
      <QuizRedirect />
      <Location />
    </MemoryRouter>,
  );
  expect(screen.getByRole("status")).toHaveTextContent("/search?type=quiz");
});

it("旧学習計画URLはplan指定を維持して復習へ移す", () => {
  render(
    <MemoryRouter initialEntries={["/quiz?plan=plan-1"]}>
      <QuizRedirect />
      <Location />
    </MemoryRouter>,
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "/review?view=quiz&plan=plan-1",
  );
});
