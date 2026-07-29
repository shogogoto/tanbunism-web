import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import QuizChainReview from "./QuizChainReview";
import type { QuizChain } from "./api";

const stats = {
  n_detail: 0,
  n_premise: 0,
  n_conclusion: 0,
  n_refer: 0,
  n_referred: 0,
};

it("関係クイズを起点・関係・終点として表示する", () => {
  const chain: QuizChain = {
    sentences: [
      {
        uid: "source",
        sentence: "群についての単文",
        term: { names: ["群"] },
        stats,
        resource_uid: "resource",
      },
      {
        uid: "destination",
        sentence: "整数の加法群についての単文",
        term: { names: ["整数の加法群"] },
        stats,
        resource_uid: "resource",
      },
    ],
    quizzes: [
      {
        quiz_id: "quiz",
        quiz_type: "rel2pair",
        readable: {
          quiz_id: "quiz",
          statement: "関係で繋がる単文を当ててください",
          options: {},
          correct: [],
          created: "2026-07-28T00:00:00Z",
          no_correct_option: false,
        },
      },
    ],
    links: [
      {
        quiz_id: "quiz",
        sentence_id: "source",
        role: "target",
      },
      {
        quiz_id: "quiz",
        sentence_id: "destination",
        role: "correct",
        relations: ["具体例"],
      },
    ],
  };

  render(
    <MemoryRouter>
      <QuizChainReview chain={chain} />
    </MemoryRouter>,
  );

  expect(screen.getByText("—[具体例]→")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "群: 群についての単文" }),
  ).toHaveAttribute("href", "/resource/resource#source");
  expect(
    screen.getByRole("link", {
      name: "整数の加法群: 整数の加法群についての単文",
    }),
  ).toHaveAttribute("href", "/resource/resource#destination");
  expect(screen.queryByText("単文へ →")).not.toBeInTheDocument();
});
