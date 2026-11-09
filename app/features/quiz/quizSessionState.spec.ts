import { expect, it, vi } from "vitest";
import type { QuizChain, QuizRecommendation } from "./api";
import {
  initialQuizSession,
  mergeRecommendations,
  quizSessionReducer as reduce,
  sessionProgress,
} from "./quizSessionState";

const quiz = (id: string, noCorrect = false): QuizRecommendation => ({
  resource_id: "book",
  quiz_type: "term2sent",
  reason: "coverage",
  quiz: {
    quiz_id: id,
    quiz_type: "term2sent",
    statement: "問題",
    prompt: { subject: "用語", answer_kind: "sentence" },
    options: { a: "A", b: "B" },
    correct: ["a"],
    no_correct_option: noCorrect,
    created: "2026-11-09",
  },
});
const chain: QuizChain = { sentences: [], quizzes: [], links: [] };
const loaded = () =>
  reduce(initialQuizSession, {
    type: "received",
    recommendations: mergeRecommendations(
      [],
      [quiz("q1"), quiz("q2")],
      (ids) => ids,
    ),
  });

it("keeps option order stable when progressive loads replace duplicate quizzes", () => {
  const shuffle = vi.fn((ids: string[]) => [...ids].reverse());
  const first = mergeRecommendations([], [quiz("q1")], shuffle);
  const next = mergeRecommendations(first, [quiz("q1"), quiz("q2")], shuffle);
  expect(next.map(({ quiz }) => quiz.quiz_id)).toEqual(["q1", "q2"]);
  expect(next[0].optionOrder).toBe(first[0].optionOrder);
  expect(next[1].optionOrder).toEqual(["b", "a"]);
  expect(shuffle).toHaveBeenCalledTimes(2);
});

it("toggles answers immutably and prevents changes during and after submission", () => {
  const original = loaded();
  const selected = reduce(original, {
    type: "toggle",
    quizId: "q1",
    optionId: "a",
  });
  expect(original.answers).toEqual({});
  expect(selected.answers.q1).toEqual(["a"]);
  expect(
    reduce(selected, { type: "toggle", quizId: "q1", optionId: "a" }).answers
      .q1,
  ).toEqual([]);
  const pending = reduce(selected, { type: "submit" });
  expect(reduce(pending, { type: "toggle", quizId: "q1", optionId: "b" })).toBe(
    pending,
  );
  const settled = reduce(pending, {
    type: "settled",
    results: { q1: { chain, isCorrect: true } },
    failed: 1,
  });
  expect(reduce(settled, { type: "toggle", quizId: "q1", optionId: "b" })).toBe(
    settled,
  );
  expect(settled.submission.status).toBe("failed");
  expect(
    sessionProgress(settled).pending.map(({ quiz }) => quiz.quiz_id),
  ).toEqual(["q2"]);
});

it("merges partial successes and retries only incorrect quizzes with a fresh local state", () => {
  const first = reduce(loaded(), {
    type: "settled",
    results: { q1: { chain, isCorrect: true } },
    failed: 1,
  });
  const complete = reduce(first, {
    type: "settled",
    results: { q2: { chain, isCorrect: false } },
    failed: 0,
  });
  expect(sessionProgress(complete)).toMatchObject({
    isComplete: true,
    answeredCount: 2,
  });
  const retry = reduce(complete, { type: "retryIncorrect" });
  expect(retry.recommendations.map(({ quiz }) => quiz.quiz_id)).toEqual(["q2"]);
  expect(retry.results).toEqual({});
  expect(retry.answers).toEqual({});
  expect(retry.activeQuizIndex).toBe(0);
  expect(sessionProgress(retry).unansweredCount).toBe(1);
  expect(reduce(retry, { type: "reset" })).toEqual(initialQuizSession);
});

it("allows an empty selection for a quiz with no correct option, but not an empty session", () => {
  expect(sessionProgress(initialQuizSession)).toMatchObject({
    allAnswered: false,
    isComplete: false,
  });
  const state = reduce(initialQuizSession, {
    type: "received",
    recommendations: mergeRecommendations([], [quiz("q", true)]),
  });
  expect(sessionProgress(state)).toMatchObject({
    allAnswered: true,
    isComplete: false,
    unansweredCount: 0,
  });
});
