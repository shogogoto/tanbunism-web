import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GlobalHotkeys, {
  HotkeyProvider,
} from "~/features/hotkeys/GlobalHotkeys";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import AnswerHistory from "./AnswerHistory";
import {
  getQuizChain,
  listAnswerHistory,
  listStudyResources,
  reportQuizIssue,
} from "./api";

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ isAuthenticated: true, user: { uid: "user-1" } }),
}));
vi.mock("~/shared/history/hooks", () => ({
  useHistory: () => ({ histories: [] }),
}));

vi.mock("./api", () => ({
  getQuizChain: vi.fn(),
  listAnswerHistory: vi.fn(),
  listStudyResources: vi.fn(),
  reportQuizIssue: vi.fn(),
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
    expect(screen.queryByText("必ず逆元が存在する")).not.toBeInTheDocument();
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
    expect(await screen.findByText("必ず逆元が存在する")).toBeInTheDocument();
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

  it("関係クイズの両方の単文へ移動でき、回答後の不備を報告できる", async () => {
    const user = userEvent.setup();
    vi.mocked(reportQuizIssue).mockResolvedValue();
    vi.mocked(listAnswerHistory).mockResolvedValue({
      total: 1,
      data: [
        {
          ...historyItem,
          quiz_type: "pair2rel",
          quiz: { ...historyItem.quiz, quiz_type: "pair2rel" },
        },
      ],
    });
    vi.mocked(getQuizChain).mockResolvedValue({
      sentences: ["target", "correct"].map((uid) => ({
        uid,
        sentence: `${uid}の単文`,
        resource_uid: "resource-1",
        stats: {
          n_detail: 0,
          n_premise: 0,
          n_conclusion: 0,
          n_refer: 0,
          n_referred: 0,
        },
      })),
      quizzes: [],
      links: [
        { quiz_id: "quiz-1", sentence_id: "target", role: "target" },
        { quiz_id: "quiz-1", sentence_id: "correct", role: "correct" },
      ],
    });
    render(
      <MemoryRouter>
        <AnswerHistory />
      </MemoryRouter>,
    );
    await user.click(
      (await screen.findAllByRole("button", { name: "クイズ詳細を見る" }))[0],
    );
    expect(
      await screen.findByRole("link", { name: "targetの単文" }),
    ).toHaveAttribute("href", "/tanbun/target");
    expect(screen.getByRole("link", { name: "correctの単文" })).toHaveAttribute(
      "href",
      "/tanbun/correct",
    );
    await user.click(screen.getByRole("button", { name: "不備を報告" }));
    await user.click(screen.getByRole("button", { name: "報告する" }));
    await waitFor(() =>
      expect(reportQuizIssue).toHaveBeenCalledWith("quiz-1", "undefined", ""),
    );
  });

  it("j kで選択行を移動しSpaceとEnterで詳細を開閉するが入力中は干渉しない", async () => {
    const user = userEvent.setup();
    vi.mocked(listAnswerHistory).mockResolvedValue({
      total: 2,
      data: [
        historyItem,
        {
          ...historyItem,
          answer: { ...historyItem.answer, answer_uid: "answer-2" },
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/dashboard?view=answers"]}>
        <HistoryPanelProvider>
          <HotkeyProvider>
            <AnswerHistory />
            <GlobalHotkeys />
          </HotkeyProvider>
        </HistoryPanelProvider>
      </MemoryRouter>,
    );
    await screen.findAllByText("用語「可換」に合う文はどれ？");
    const rows = document.querySelectorAll("[data-hotkey-item]");
    await user.keyboard("j");
    expect(rows[0]).toHaveFocus();
    expect(rows[0]).toHaveAttribute("data-hotkey-active", "true");
    await user.keyboard(" ");
    expect(
      await screen.findByRole("button", { name: "不備を報告" }),
    ).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(
      screen.queryByRole("button", { name: "不備を報告" }),
    ).not.toBeInTheDocument();
    await user.keyboard("j");
    expect(rows[1]).toHaveFocus();
    await user.keyboard("k");
    expect(rows[0]).toHaveFocus();
    await user.click(screen.getByLabelText("正誤"));
    await user.keyboard("j");
    expect(screen.getByLabelText("正誤")).toHaveFocus();
    await user.keyboard("{Escape}?");
    expect(screen.getByText("回答履歴の行を移動")).toBeVisible();
  });
});
