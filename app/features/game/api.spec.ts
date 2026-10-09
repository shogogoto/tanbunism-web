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
  vi.mocked(searchByTextTanbunGet).mockResolvedValue({
    status: 200,
    headers: new Headers(),
    data: { total: 0, data: [], resource_infos: {} },
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
  expect(await loadDungeon("resource")).toEqual({ knowledge: [], quizzes: [] });
  expect(searchByTextTanbunGet).toHaveBeenCalledWith(
    expect.objectContaining({ resource_id: "resource" }),
    { credentials: "include" },
  );
  expect(recommendQuizzes).toHaveBeenCalledWith("plan", "sent2term", {
    generateMissing: false,
  });
});
