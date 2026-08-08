import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Graph from "graphology";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import { ResourceDetailProvider } from "./Context";
import SentenceQuizActions from "./SentenceQuizActions";

const graph = new Graph({ multi: true, type: "directed" });
graph.addNode("sentence-1");
graph.addNode("sentence-2");
graph.addDirectedEdge("sentence-1", "sentence-2", { etype: "example" });

const createRequests: unknown[] = [];

const server = setupServer(
  http.get("*/quiz/created", () =>
    HttpResponse.json({
      data: [
        {
          quiz_id: "quiz-1",
          statement: "既存のクイズ",
          options: { "sentence-1": "正しい単文" },
          correct: ["sentence-1"],
          created: "2026-07-27T00:00:00Z",
          no_correct_option: false,
        },
      ],
      total: 1,
    }),
  ),
  http.post("*/quiz", async ({ request }) => {
    createRequests.push(await request.json());
    return HttpResponse.json({
      quiz_id: "quiz-2",
      statement: "「可換」に合う文を当ててください",
      options: {},
      correct: [],
      created: "2026-07-28T00:00:00Z",
      no_correct_option: false,
    });
  }),
  http.post("*/quiz/answer/quiz-1", async ({ request }) => {
    const body = (await request.json()) as { selected: string[] };
    return HttpResponse.json({
      sentences: [
        {
          uid: "sentence-1",
          sentence: "正しい単文",
          term: { names: ["正解"] },
          stats: {},
          resource_uid: "resource-1",
        },
      ],
      quizzes: [{ quiz_id: "quiz-1", quiz_type: "term2sent" }],
      links: [
        {
          quiz_id: "quiz-1",
          sentence_id: "sentence-1",
          role: "correct",
          relations: ["具体例"],
        },
      ],
      answers: [
        {
          answer_uid: "answer-1",
          quiz_uid: "quiz-1",
          selected: body.selected,
          who: "user-1",
          is_correct: body.selected.includes("sentence-1"),
          created: "2026-07-28T00:00:00Z",
        },
      ],
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  createRequests.length = 0;
});
afterAll(() => server.close());

it("単文のQuizを確認し、その場から新しく作成する", async () => {
  const user = userEvent.setup();
  const refresh = vi.fn(async () => {});

  render(
    <MemoryRouter>
      <ResourceDetailProvider
        graph={graph}
        uids={{
          "sentence-1": "対象の単文",
          "sentence-2": "関連する単文",
        }}
        terms={{
          "sentence-2": { names: ["具体例"] },
        }}
        rootId="resource-1"
        resource_info={null as never}
        sentenceQuizStatuses={
          new Map([
            [
              "sentence-1",
              {
                sentence_id: "sentence-1",
                total_quizzes: 2,
                quiz_counts: { term2sent: 2 },
              },
            ],
          ])
        }
        refreshSentenceQuizStatuses={refresh}
      >
        <SentenceQuizActions sentenceId="sentence-1" />
      </ResourceDetailProvider>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole("button", { name: "クイズ 2" }));
  expect(await screen.findByText("既存のクイズ")).toBeInTheDocument();
  expect(screen.getByText("正しい単文")).toBeInTheDocument();
  expect(screen.queryByText("正解")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "正しい単文" }));
  await user.click(screen.getByRole("button", { name: "回答する" }));
  expect(await screen.findByText("正解です")).toBeInTheDocument();
  expect(screen.getAllByText("正解")).not.toHaveLength(0);
  expect(screen.queryByText("このクイズの知識")).not.toBeInTheDocument();
  expect(screen.getByText("具体例")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "正しい単文" })).toHaveAttribute(
    "href",
    "/resource/resource-1#sentence-1",
  );
  expect(screen.getByRole("link", { name: "一覧で管理" })).toHaveAttribute(
    "href",
    "/quiz/list?resource=resource-1&sentence=sentence-1",
  );

  await user.click(screen.getByRole("button", { name: "＋ クイズ" }));
  await user.click(
    screen.getByRole("menuitem", { name: "用語から単文を当てる" }),
  );

  expect(refresh).toHaveBeenCalledOnce();

  await user.click(screen.getByRole("button", { name: "＋ クイズ" }));
  await user.click(
    screen.getByRole("menuitem", { name: "関係から単文を当てる…" }),
  );
  await user.click(
    screen.getByRole("button", { name: /具体例.*関連する単文/ }),
  );

  expect(createRequests).toContainEqual(
    expect.objectContaining({
      target_sent_uid: "sentence-1",
      correct_sent_uids: ["sentence-2"],
      quiz_type: "rel2pair",
    }),
  );

  await user.click(screen.getByRole("button", { name: "＋ クイズ" }));
  await user.click(
    screen.getByRole("menuitem", { name: "単文ペアから関係を当てる…" }),
  );
  await user.click(
    screen.getByRole("button", { name: /具体例.*関連する単文/ }),
  );

  expect(createRequests).toContainEqual(
    expect.objectContaining({
      target_sent_uid: "sentence-1",
      correct_sent_uids: ["sentence-2"],
      quiz_type: "pair2rel",
    }),
  );
});
