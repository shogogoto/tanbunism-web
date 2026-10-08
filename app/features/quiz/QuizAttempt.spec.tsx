import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import QuizAttempt from "./QuizAttempt";
import { answerQuiz } from "./api";

vi.mock("./api", () => ({ answerQuiz: vi.fn() }));

it("参照方向を補足しても元の選択肢IDで回答する", async () => {
  const user = userEvent.setup();
  vi.mocked(answerQuiz).mockResolvedValue({
    quizzes: [],
    sentences: [],
    links: [],
  });
  render(
    <MemoryRouter>
      <QuizAttempt
        compactMobile
        quiz={{
          quiz_id: "reference-quiz",
          quiz_type: "pair2rel",
          prompt: {
            subject: "Aの単文",
            object: "Bの単文",
            subject_terms: ["Aの用語"],
            object_terms: ["Bの用語"],
            relations: [{ name: null, is_forward: true }],
            answer_kind: "relation",
          },
          statement: "旧問題文",
          options: { refer: "用語参照", referred: "被参照" },
          correct: ["referred"],
          created: "2026-10-06T00:00:00Z",
          no_correct_option: false,
        }}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("button", { name: "被参照（BがAを参照）" }),
  ).toHaveClass("min-h-11", "py-2", "text-base");
  const report = screen.getByRole("button", { name: "不備を報告" });
  expect(report).toHaveClass("min-h-11", "min-w-11");
  expect(report.querySelector("span")).toHaveClass("hidden", "sm:inline");
  await user.click(
    screen.getByRole("button", { name: "被参照（BがAを参照）" }),
  );
  expect(
    screen.getByRole("button", { name: "被参照（BがAを参照）" }),
  ).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: "回答する" }));
  expect(answerQuiz).toHaveBeenCalledWith("reference-quiz", ["referred"]);
});
