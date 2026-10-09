import { beforeEach, expect, it, vi } from "vitest";
import { listStudyPlans, recommendQuizzes } from "~/features/quiz/api";
import { searchByTextTanbunGet } from "~/shared/generated/tanbun/tanbun";
import { loadDungeon } from "./api";

vi.mock("~/features/quiz/api", () => ({
  listStudyPlans: vi.fn(),
  recommendQuizzes: vi.fn(),
}));
vi.mock("~/shared/generated/tanbun/tanbun", () => ({
  searchByTextTanbunGet: vi.fn(),
}));
beforeEach(() => vi.resetAllMocks());
it("scopes knowledge and prepared quizzes to one resource without generation", async () => {
  const tanbun = {
    uid: "sentence",
    sentence: "知識本文",
    resource_uid: "resource",
    term: { names: ["用語", "別名"] },
    stats: {
      n_detail: 0,
      n_premise: 0,
      n_conclusion: 0,
      n_refer: 0,
      n_referred: 0,
    },
  };
  vi.mocked(searchByTextTanbunGet).mockResolvedValue({
    status: 200,
    headers: new Headers(),
    data: { total: 1, data: [tanbun], resource_infos: {} },
  });
  vi.mocked(listStudyPlans).mockResolvedValue([
    {
      uid: "plan",
      name: "本",
      resource_ids: ["resource"],
      quiz_types: ["sent2term"],
      n_quiz: 20,
      n_option: 4,
      created: "2026-10-08T00:00:00Z",
    },
  ]);
  vi.mocked(recommendQuizzes).mockResolvedValue([]);
  expect(await loadDungeon("resource")).toEqual({
    knowledge: [tanbun],
    quizzes: [],
  });
  expect(searchByTextTanbunGet).toHaveBeenCalledTimes(1);
  expect(searchByTextTanbunGet).toHaveBeenCalledWith(
    expect.objectContaining({ resource_id: "resource" }),
    { credentials: "include" },
  );
  expect(recommendQuizzes).toHaveBeenCalledWith("plan", "sent2term", {
    generateMissing: false,
  });
});
