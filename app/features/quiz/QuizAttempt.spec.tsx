import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import QuizAttempt from "./QuizAttempt";
import { answerQuiz } from "./api";

vi.mock("./api", () => ({ answerQuiz: vi.fn() }));

it("shuffles per attempt, keeps the displayed order on rerender and submits original IDs", async () => {
  const random = vi.spyOn(Math, "random").mockReturnValue(0);
  try {
    const quiz = {
      quiz_id: "shuffle",
      quiz_type: "sent2term" as const,
      statement: "例",
      prompt: { subject: "例", answer_kind: "term" as const },
      options: { "1": "A", "2": "B", "3": "C" },
      correct: ["2"],
      created: "2026-01-01T00:00:00Z",
      no_correct_option: false,
    };
    const confirm = vi.fn();
    const content = (key: number) => (
      <MemoryRouter>
        <QuizAttempt
          key={key}
          quiz={{ ...quiz, options: { ...quiz.options } }}
          allowReport={false}
          onConfirm={confirm}
        />
      </MemoryRouter>
    );
    const view = render(content(1));
    const labels = () =>
      screen
        .getAllByRole("button")
        .filter((button) => button.hasAttribute("data-quiz-option-index"))
        .map((button) => button.getAttribute("aria-label"));
    expect(labels()).toEqual(["B", "C", "A"]);
    await userEvent.click(screen.getByRole("button", { name: /^B$/ }));
    random.mockReturnValue(0.999);
    view.rerender(content(1));
    expect(labels()).toEqual(["B", "C", "A"]);
    await userEvent.click(screen.getByRole("button", { name: "回答を確定" }));
    expect(confirm).toHaveBeenCalledWith(["2"]);
    view.rerender(content(2));
    expect(labels()).toEqual(["A", "B", "C"]);
  } finally {
    random.mockRestore();
  }
});

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
