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
    quiz_type: "term2sent" as const,
    prompt: {
      subject: "用語「可換」に合う文はどれ？",
      answer_kind: "sentence" as const,
    },
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
    for (const link of screen.getAllByRole("link", { name: "数学ノート" })) {
      expect(link).toHaveAttribute("href", "/resource/resource-1");
    }
    expect(screen.getAllByText("必ず逆元が存在する").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("最近の回答を確認し、間違えたクイズを復習します。"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "作成したクイズ" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "クイズを解く" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "クイズ詳細を見る" })[0],
    );
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
