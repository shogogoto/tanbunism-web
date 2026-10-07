import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import QuizOptionTerms from "./QuizOptionTerms";
import type { ReadableQuiz } from "./api";

const quiz: ReadableQuiz & { option_terms: Record<string, string[]> } = {
  quiz_id: "quiz",
  quiz_type: "rel2pair",
  prompt: {
    subject: "Aの単文",
    subject_terms: ["前提の用語"],
    object_terms: ["対象の用語"],
    answer_kind: "sentence",
  },
  options: { candidate: "候補の単文" },
  option_terms: { candidate: ["候補の用語", "候補の用語"] },
  correct: ["candidate"],
  statement: "問題",
  created: "2026-10-07T00:00:00Z",
  no_correct_option: false,
};

it("単文選択肢の用語を重複せず表示する", () => {
  render(<QuizOptionTerms quiz={quiz} optionId="candidate" />);
  expect(screen.getAllByText("候補の用語")).toHaveLength(1);
  expect(screen.queryByText("前提の用語")).not.toBeInTheDocument();
});

it("関係選択肢ではA・Bの用語だけを示し候補の用語を漏らさない", () => {
  render(
    <QuizOptionTerms
      quiz={{ ...quiz, quiz_type: "pair2rel" }}
      optionId="candidate"
    />,
  );
  expect(screen.getByText("A: 前提の用語")).toBeInTheDocument();
  expect(screen.getByText("B: 対象の用語")).toBeInTheDocument();
  expect(screen.queryByText("候補の用語")).not.toBeInTheDocument();
});

it("古いキャッシュに選択肢の用語がなくても表示できる", () => {
  const { option_terms: _, ...cached } = quiz;
  const { container } = render(
    <QuizOptionTerms quiz={cached} optionId="candidate" />,
  );
  expect(container).toBeEmptyDOMElement();
});
