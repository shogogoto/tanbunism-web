import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { invalidateGamification } from "~/features/gamification/invalidate";
import {
  type QuizChain,
  type QuizRecommendation,
  type StudyPlan,
  answerQuiz,
  listStudyPlans,
  recommendQuizzes,
} from "./api";
import { useQuizSession } from "./useQuizSession";

vi.mock("./api", () => ({
  answerQuiz: vi.fn(),
  listStudyPlans: vi.fn(),
  recommendQuizzes: vi.fn(),
  createStudyPlan: vi.fn(),
  listStudyResources: vi.fn(),
  prepareAdditionalStudyPlanQuizzes: vi.fn(),
}));
vi.mock("~/features/gamification/invalidate", () => ({
  invalidateGamification: vi.fn(async () => undefined),
}));
const plan = (uid: string): StudyPlan => ({
  uid,
  name: uid,
  resource_ids: ["book"],
  quiz_types: ["term2sent"],
  n_quiz: 1,
  n_option: 2,
  default_resource_plan: false,
  created: "2026-11-09",
});
const quiz = (id: string): QuizRecommendation => ({
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
    no_correct_option: false,
    created: "2026-11-09",
  },
});
const chain: QuizChain = { sentences: [], quizzes: [], links: [] };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listStudyPlans)
    .mockReset()
    .mockResolvedValue([plan("one"), plan("two")]);
  vi.mocked(recommendQuizzes)
    .mockReset()
    .mockImplementation(async (id) => [quiz(id)]);
  vi.mocked(answerQuiz).mockReset();
});

it("prevents duplicate writes and ignores a previous plan's late submission result", async () => {
  const { result } = renderHook(() => useQuizSession());
  await waitFor(() =>
    expect(result.current.recommendations[0]?.quiz.quiz_id).toBe("one"),
  );
  const answer = deferred<QuizChain>();
  vi.mocked(answerQuiz).mockReturnValueOnce(answer.promise);
  let pending!: Promise<void>;
  act(() => {
    result.current.toggleOption("one", "a");
  });
  act(() => {
    pending = result.current.submitAnswers();
  });
  await act(async () => {
    await result.current.submitAnswers();
  });
  expect(answerQuiz).toHaveBeenCalledTimes(1);
  act(() => result.current.setPlanId("two"));
  await waitFor(() =>
    expect(result.current.recommendations[0]?.quiz.quiz_id).toBe("two"),
  );
  await act(async () => {
    answer.resolve(chain);
    await pending;
  });
  expect(result.current.results).toEqual({});
  expect(result.current.isSubmitting).toBe(false);
  expect(invalidateGamification).toHaveBeenCalledOnce();
});

it("retains successful submissions and retries only the failed write", async () => {
  vi.mocked(recommendQuizzes).mockResolvedValueOnce([quiz("q1"), quiz("q2")]);
  const { result } = renderHook(() => useQuizSession());
  await waitFor(() =>
    expect(result.current.isPreparingRecommendations).toBe(false),
  );
  await waitFor(() => expect(result.current.recommendations).toHaveLength(2));
  act(() => {
    result.current.toggleOption("q1", "a");
    result.current.toggleOption("q2", "b");
  });
  vi.mocked(answerQuiz)
    .mockResolvedValueOnce(chain)
    .mockRejectedValueOnce(new Error("offline"));
  await act(async () => {
    await result.current.submitAnswers();
  });
  expect(result.current.results.q1).toBeDefined();
  expect(result.current.submitError).toContain("1問");
  vi.mocked(answerQuiz).mockResolvedValueOnce(chain);
  await act(async () => {
    await result.current.submitAnswers();
  });
  expect(answerQuiz).toHaveBeenCalledTimes(3);
  expect(answerQuiz).toHaveBeenLastCalledWith("q2", ["b"]);
  expect(result.current.isComplete).toBe(true);
  expect(result.current.submitError).toBeUndefined();
});

it("aborts an outdated recommendation load and ignores its result after switching plans", async () => {
  const old = deferred<QuizRecommendation[]>();
  vi.mocked(recommendQuizzes).mockReturnValueOnce(old.promise);
  const { result } = renderHook(() => useQuizSession());
  await waitFor(() => expect(recommendQuizzes).toHaveBeenCalledOnce());
  const signal = vi.mocked(recommendQuizzes).mock.calls[0][2]?.signal;
  act(() => result.current.setPlanId("two"));
  await waitFor(() =>
    expect(result.current.recommendations[0]?.quiz.quiz_id).toBe("two"),
  );
  expect(signal?.aborted).toBe(true);
  await act(async () => old.resolve([quiz("old")]));
  expect(
    result.current.recommendations.map(({ quiz }) => quiz.quiz_id),
  ).toEqual(["two"]);
});

it("does not apply late writes after unmount and does not automatically repeat them", async () => {
  const answer = deferred<QuizChain>();
  vi.mocked(answerQuiz).mockReturnValueOnce(answer.promise);
  const { result, unmount } = renderHook(() => useQuizSession());
  await waitFor(() => expect(result.current.recommendations).toHaveLength(1));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.submitAnswers();
  });
  unmount();
  await act(async () => {
    answer.resolve(chain);
    await pending;
  });
  expect(answerQuiz).toHaveBeenCalledOnce();
  expect(result.current.results).toEqual({});
});
