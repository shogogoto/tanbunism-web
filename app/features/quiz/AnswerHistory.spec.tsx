import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function BackToAnswers() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(-1)}>
      戻る
    </button>
  );
}

const historyRows = (count: number, start = 1) =>
  Array.from({ length: count }, (_, index) => ({
    ...historyItem,
    answer: { ...historyItem.answer, answer_uid: `answer-${start + index}` },
  }));

describe("AnswerHistory", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(listAnswerHistory).mockReset();
    vi.mocked(getQuizChain).mockClear();
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

  afterEach(() => vi.unstubAllGlobals());

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

  it("末尾の表示で続きを追記し、取得に失敗しても表示済みの回答を保持して再試行できる", async () => {
    const user = userEvent.setup();
    let intersect: IntersectionObserverCallback | undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersect = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.mocked(listAnswerHistory)
      .mockResolvedValueOnce({ total: 21, data: historyRows(20) })
      .mockRejectedValueOnce(new Error("一時的なエラー"))
      .mockResolvedValueOnce({ total: 21, data: historyRows(1, 21) });
    render(
      <MemoryRouter>
        <AnswerHistory />
      </MemoryRouter>,
    );
    await screen.findByRole("button", { name: "続きを読み込む" });
    await waitFor(() => {
      expect(document.querySelectorAll("[data-answer-id]")).toHaveLength(20);
      expect(intersect).toBeDefined();
    });
    await act(async () =>
      intersect?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "一時的なエラー",
    );
    expect(document.querySelectorAll("[data-answer-id]")).toHaveLength(20);
    await user.click(screen.getByRole("button", { name: "続きを読み込む" }));
    await screen.findByText("すべての回答を表示しました");
    expect(document.querySelectorAll("[data-answer-id]")).toHaveLength(21);
    expect(listAnswerHistory).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it("末尾でjを押すと次のページへ進み、最後の回答で先頭へ循環しない", async () => {
    const user = userEvent.setup();
    vi.mocked(listAnswerHistory)
      .mockResolvedValueOnce({ total: 21, data: historyRows(20) })
      .mockResolvedValueOnce({ total: 21, data: historyRows(1, 21) });
    render(
      <MemoryRouter>
        <HistoryPanelProvider>
          <HotkeyProvider>
            <AnswerHistory />
            <GlobalHotkeys />
          </HotkeyProvider>
        </HistoryPanelProvider>
      </MemoryRouter>,
    );
    await screen.findByRole("button", { name: "続きを読み込む" });
    await user.keyboard("j".repeat(20));
    expect(document.activeElement).toHaveAttribute(
      "data-answer-id",
      "answer-20",
    );
    await user.keyboard("j");
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute(
        "data-answer-id",
        "answer-21",
      ),
    );
    await user.keyboard("j");
    expect(document.activeElement).toHaveAttribute(
      "data-answer-id",
      "answer-21",
    );
    expect(listAnswerHistory).toHaveBeenCalledTimes(2);
  });

  it("単文詳細から戻ると一覧・current・展開状態・スクロール位置を復元する", async () => {
    const user = userEvent.setup();
    vi.mocked(getQuizChain).mockResolvedValue({
      sentences: [
        {
          uid: "target",
          sentence: "対象の単文",
          resource_uid: "resource-1",
          stats: {
            n_detail: 0,
            n_premise: 0,
            n_conclusion: 0,
            n_refer: 0,
            n_referred: 0,
          },
        },
      ],
      quizzes: [],
      links: [{ quiz_id: "quiz-1", sentence_id: "target", role: "target" }],
    });
    render(
      <MemoryRouter initialEntries={["/answers"]}>
        <div data-testid="scroller" style={{ overflowY: "auto", height: 200 }}>
          <Routes>
            <Route path="/answers" element={<AnswerHistory />} />
            <Route path="/tanbun/:id" element={<BackToAnswers />} />
          </Routes>
        </div>
      </MemoryRouter>,
    );
    await user.click(
      (await screen.findAllByRole("button", { name: "クイズ詳細を見る" }))[0],
    );
    const link = await screen.findByRole("link", { name: "対象の単文" });
    const container = screen.getByTestId("scroller");
    container.scrollTop = 430;
    fireEvent.scroll(container);
    await user.click(link);
    container.scrollTop = 0;
    await user.click(screen.getByRole("button", { name: "戻る" }));
    expect(
      await screen.findByRole("link", { name: "対象の単文" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute(
        "data-answer-id",
        "answer-1",
      );
      expect(container.scrollTop).toBe(430);
    });
    expect(document.activeElement).toHaveAttribute(
      "data-hotkey-active",
      "true",
    );
    expect(listAnswerHistory).toHaveBeenCalledTimes(1);
    expect(getQuizChain).toHaveBeenCalledTimes(1);
  });
});
