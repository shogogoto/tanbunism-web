import { beforeEach, expect, it, vi } from "vitest";
import { listStudyPlans, recommendQuizzes } from "~/features/quiz/api";
import {
  detailTanbunSentenceSentenceIdGet,
  searchByTextTanbunGet,
} from "~/shared/generated/tanbun/tanbun";
import { tanbunDetailCache } from "~/shared/lib/indexed";
import {
  type DungeonContent,
  freezeRegionEnemies,
  loadConnectedKnowledge,
  loadDungeon,
  regionEnemies,
  validateKnowledge,
} from "./api";

vi.mock("~/features/quiz/api", () => ({
  listStudyPlans: vi.fn(),
  recommendQuizzes: vi.fn(),
}));
vi.mock("~/shared/generated/tanbun/tanbun", () => ({
  searchByTextTanbunGet: vi.fn(),
  detailTanbunSentenceSentenceIdGet: vi.fn(),
}));
vi.mock("~/shared/lib/indexed", () => ({
  tanbunDetailCache: { get: vi.fn(), set: vi.fn() },
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options: RequestInit) => {
      const body = JSON.parse(options.body as string);
      return new Response(JSON.stringify(body.sentence_ids), { status: 200 });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
it("freezes all prepared enemies in a band and leaves older bands unchanged", () => {
  const quiz = (quiz_id: string): DungeonContent["quizzes"][number] => ({
    quiz_id,
    quiz_type: "sent2term",
    prompt: { subject: "知識", answer_kind: "term" },
    statement: "知識",
    options: { a: "用語" },
    correct: ["a"],
    created: "2026-10-10T00:00:00Z",
    no_correct_option: false,
  });
  const content: DungeonContent = {
    knowledge: [],
    quizzes: [quiz("q1"), quiz("q2"), quiz("q3"), quiz("q4")],
  };
  const first = freezeRegionEnemies(content, "book", 0);
  expect(regionEnemies(first, "book", 0)).toHaveLength(3);
  expect(first.regionQuizPools?.[0]).toEqual(["q1", "q2", "q3", "q4"]);
  const expanded = freezeRegionEnemies(
    {
      ...first,
      quizzes: [...content.quizzes, quiz("q5")],
    },
    "book",
    1,
  );
  expect(expanded.regionEnemies?.[0]).toEqual(first.regionEnemies?.[0]);
  expect(expanded.regionQuizPools?.[0]).toEqual(["q1", "q2", "q3", "q4"]);
  expect(expanded.regionEnemies?.[1]).toHaveLength(3);
  expect(expanded.regionQuizPools?.[1]).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  expect(expanded.regionEnemies?.[1][0]).toMatchObject({
    quizIndex: 0,
    quizIndexes: [0, 3],
  });
  expect(expanded.regionEnemies?.[1][0]).not.toHaveProperty("hp");
  expect(expanded.regionEnemies?.[1][0]).not.toHaveProperty("attack");
  expect(JSON.parse(JSON.stringify(expanded)).regionEnemies).toEqual(
    expanded.regionEnemies,
  );
});
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
      default_resource_plan: false,
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

it("uses cached direct graph neighbours only, excluding other resources and the center", async () => {
  vi.mocked(tanbunDetailCache.get).mockResolvedValue({
    uid: "a",
    g: {
      directed: true,
      multigraph: true,
      graph: {},
      nodes: [],
      edges: [
        { source: "a", target: "b", type: "BELOW", key: 0 },
        { source: "c", target: "a", type: "BELOW", key: 0 },
        { source: "a", target: "outside", type: "BELOW", key: 0 },
        { source: "b", target: "unrelated", type: "BELOW", key: 0 },
      ],
    },
    knowdes: Object.fromEntries(
      ["a", "b", "c", "outside", "unrelated"].map((uid) => [
        uid,
        {
          uid,
          sentence: uid,
          resource_uid: uid === "outside" ? "other" : "book",
        },
      ]),
    ),
  } as unknown as Awaited<ReturnType<typeof tanbunDetailCache.get>>);
  expect(
    (await loadConnectedKnowledge("book", "a")).map((item) => item.uid),
  ).toEqual(["b", "c"]);
  expect(detailTanbunSentenceSentenceIdGet).not.toHaveBeenCalled();
});

it("rechecks cached graph neighbours and excludes orphaned knowledge", async () => {
  vi.mocked(tanbunDetailCache.get).mockResolvedValue({
    uid: "a",
    g: {
      edges: [
        { source: "a", target: "orphan" },
        { source: "a", target: "valid" },
      ],
    },
    knowdes: {
      orphan: { uid: "orphan", sentence: "古い文", resource_uid: "book" },
      valid: { uid: "valid", sentence: "現行の文", resource_uid: "book" },
    },
  } as unknown as Awaited<ReturnType<typeof tanbunDetailCache.get>>);
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify(["valid"]), { status: 200 }),
  );
  expect(
    (await loadConnectedKnowledge("book", "a")).map((item) => item.uid),
  ).toEqual(["valid"]);
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/game/knowledge/validate"),
    expect.objectContaining({ credentials: "include", cache: "no-store" }),
  );
});

it("fails closed if validation cannot be reached rather than returning stale candidates", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response("unavailable", { status: 503 }),
  );
  await expect(validateKnowledge("book", ["a"])).rejects.toThrow("有効性");
});
