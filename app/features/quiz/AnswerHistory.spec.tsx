import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnswerHistory from "./AnswerHistory";
import { getQuizChain, listAnswerHistory, listStudyResources } from "./api";

vi.mock("./api", () => ({
  getQuizChain: vi.fn(),
  listAnswerHistory: vi.fn(),
  listStudyResources: vi.fn(),
}));

const historyItem = {
  answer: {
    answer_uid: "answer-1",
    quiz_uid: "quiz-1",
    selected: ["wrong"],
    who: "user-1",
    is_correct: false,
    created: "2026-09-26T00:00:00Z",
  },
  quiz_type: "term2sent" as const,
  resource_id: "resource-1",
  quiz: {
    quiz_id: "quiz-1",
    statement: "用語「可換」に合う文はどれ？",
    options: {
      correct: "演算順序を交換できる",
      wrong: "必ず逆元が存在する",
    },
    correct: ["correct"],
    created: "2026-09-25T00:00:00Z",
    no_correct_option: false,
  },
};

describe("AnswerHistory", () => {
  beforeEach(() => {
    vi.mocked(listAnswerHistory).mockResolvedValue({
      data: [historyItem],
      total: 1,
    });
    vi.mocked(listStudyResources).mockResolvedValue([
      { uid: "resource-1", name: "数学ノート" },
    ]);
    vi.mocked(getQuizChain).mockResolvedValue({
      sentences: [],
      quizzes: [],
      links: [],
      answers: [],
    });
  });

  it("回答の正誤と選択内容を表示し、QuizChainを追加取得する", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AnswerHistory />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("用語「可換」に合う文はどれ？"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "数学ノート" })).toHaveAttribute(
      "href",
      "/resource/resource-1",
    );
    expect(screen.getByText("必ず逆元が存在する")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "クイズ詳細を見る" }));
    await waitFor(() => expect(getQuizChain).toHaveBeenCalledWith("quiz-1"));
  });

  it("不正解だけに絞り込む", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AnswerHistory />
      </MemoryRouter>,
    );
    await screen.findByText("用語「可換」に合う文はどれ？");

    await user.selectOptions(screen.getByLabelText("正誤"), "false");

    await waitFor(() =>
      expect(listAnswerHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ is_correct: false, page: 1 }),
      ),
    );
  });
});
