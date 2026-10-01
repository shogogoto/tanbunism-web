import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuizPrompt from "./QuizPrompt";
import type { ReadableQuiz } from "./api";

function quiz(overrides: Partial<ReadableQuiz>): ReadableQuiz {
  return {
    quiz_id: "quiz-1",
    quiz_type: "term2sent",
    prompt: { subject: "構造言語学", answer_kind: "sentence" },
    statement: "旧形式の問題文",
    options: {},
    correct: [],
    created: "2026-09-30T00:00:00Z",
    no_correct_option: false,
    ...overrides,
  };
}

describe("QuizPrompt", () => {
  it("用語と回答対象を分けて表示する", () => {
    render(<QuizPrompt quiz={quiz({})} />);

    expect(screen.getByText("用語 → 単文")).toBeInTheDocument();
    expect(screen.getByText("構造言語学")).toBeInTheDocument();
    expect(
      screen.getByText("この用語を説明する単文を選ぶ"),
    ).toBeInTheDocument();
    expect(screen.queryByText("旧形式の問題文")).not.toBeInTheDocument();
  });

  it("関係から単文を問うときは関係名と未知の到達先を示す", () => {
    render(
      <QuizPrompt
        quiz={quiz({
          quiz_type: "rel2pair",
          prompt: {
            subject: "動物は分類される",
            subject_terms: ["動物分類"],
            relations: [{ name: "BELOW", is_forward: true }],
            answer_kind: "sentence",
          },
        })}
      />,
    );

    expect(screen.getByText("関係 → 単文")).toBeInTheDocument();
    expect(screen.getByText("動物は分類される")).toBeInTheDocument();
    expect(screen.getByText("動物分類")).toBeInTheDocument();
    expect(screen.getByLabelText("関係の経路")).toHaveTextContent(
      "A—[BELOW]→?",
    );
  });

  it("単文組から関係を問うときは関係名を隠して両方の単文を示す", () => {
    render(
      <QuizPrompt
        quiz={quiz({
          quiz_type: "pair2rel",
          prompt: {
            subject: "哺乳類は動物である",
            subject_terms: ["哺乳類"],
            object: "犬は哺乳類である",
            object_terms: ["犬"],
            relations: [{ name: null, is_forward: false }],
            answer_kind: "relation",
          },
        })}
      />,
    );

    expect(screen.getByText("哺乳類は動物である")).toBeInTheDocument();
    expect(screen.getByText("犬は哺乳類である")).toBeInTheDocument();
    expect(screen.getByText("哺乳類")).toBeInTheDocument();
    expect(screen.getByText("犬")).toBeInTheDocument();
    expect(screen.getByLabelText("関係の経路")).toHaveTextContent("A←[?]—B");
  });

  it("古いAPIレスポンスでは従来の問題文へフォールバックする", () => {
    const legacy = {
      ...quiz({}),
      prompt: undefined,
      quiz_type: undefined,
    } as unknown as ReadableQuiz;

    render(<QuizPrompt quiz={legacy} />);

    expect(screen.getByText("旧形式の問題文")).toBeInTheDocument();
  });
});
