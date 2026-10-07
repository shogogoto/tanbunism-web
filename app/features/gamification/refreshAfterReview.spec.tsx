import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import { SWRConfig } from "swr";
import { vi } from "vitest";
import QuizAttempt from "~/features/quiz/QuizAttempt";
import { answerQuiz } from "~/features/quiz/api";
import PersonalTimeline from "~/features/review/PersonalTimeline";
import { markTanbunSeen } from "~/features/review/api";
import HeaderXpProgress from "~/layouts/SidebarLayout/HeaderXpProgress";
import type { UserRead } from "~/shared/generated/fastAPI.schemas";
import { genericCache } from "~/shared/lib/indexed";

vi.mock("~/features/quiz/api", () => ({ answerQuiz: vi.fn() }));
vi.mock("~/features/review/api", () => ({
  listPersonalTanbuns: vi.fn().mockResolvedValue([
    {
      uid: "sentence-1",
      sentence: "復習する単文",
      term_names: [],
      resource_uid: "resource-1",
      resource_name: "読書メモ",
      score: 1,
      exposure_count: 0,
      seen_today: false,
    },
  ]),
  getTodayTanbunExposureCount: vi.fn().mockResolvedValue({ count: 0 }),
  markTanbunSeen: vi.fn(),
}));
vi.mock("~/features/tanbun/detail/index", () => ({ default: () => null }));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(async () => {
  server.resetHandlers();
  vi.clearAllMocks();
  await genericCache.clear();
});

const user = { uid: "user-1", username: "user-1" } as UserRead;
const quiz = {
  quiz_id: "quiz-1",
  quiz_type: "term2sent" as const,
  prompt: {
    subject: "問題",
    object: null,
    relations: [],
    answer_kind: "sentence" as const,
  },
  statement: "問題",
  options: { option: "選択肢" },
  correct: ["option"],
  created: "2026-10-07",
  no_correct_option: false,
};

it.each(["quiz", "exposure"])(
  "%sの加点後、30秒のキャッシュ期間内でもヘッダーのLvとXPを再取得する",
  async (mode) => {
    const input = userEvent.setup();
    let fetches = 0;
    let finishRefresh: (() => void) | undefined;
    server.use(
      http.get("*/user/user-1/learning-progress", async () => {
        fetches += 1;
        if (fetches > 1) {
          await new Promise<void>((resolve) => {
            finishRefresh = resolve;
          });
        }
        return HttpResponse.json({
          level: fetches > 1 ? 2 : 1,
          current_level_xp: fetches > 1 ? 0 : 9,
          xp_for_next_level: fetches > 1 ? 20 : 10,
          total_xp: fetches > 1 ? 10 : 9,
          today_xp: fetches > 1 ? 1 : 0,
        });
      }),
    );
    vi.mocked(answerQuiz).mockResolvedValue({
      quizzes: [],
      sentences: [],
      links: [],
    });
    vi.mocked(markTanbunSeen).mockResolvedValue({
      sentence_id: "sentence-1",
      seen_on: "2026-10-07",
      exposure_count: 1,
      recorded: true,
    });
    await genericCache.set("public:profile-detail:resource-xp-v4:user-1", {
      stale: true,
    });
    render(
      <SWRConfig
        value={{ provider: () => new Map(), dedupingInterval: 30_000 }}
      >
        <MemoryRouter>
          <HeaderXpProgress user={user} />
          {mode === "quiz" ? <QuizAttempt quiz={quiz} /> : <PersonalTimeline />}
        </MemoryRouter>
      </SWRConfig>,
    );
    await screen.findByText("Lv.1");
    if (mode === "quiz") {
      await input.click(screen.getByRole("button", { name: /選択肢/ }));
      await input.click(screen.getByRole("button", { name: "回答する" }));
    } else {
      await input.click(
        await screen.findByRole("button", {
          name: "今日見たことを記録、累計0日",
        }),
      );
    }
    await waitFor(() => expect(fetches).toBe(2));
    // 更新中にバーを消したり、Lv1・0XPを仮表示しない。
    expect(screen.getByText("Lv.1")).toBeVisible();
    expect(screen.getByText("9 / 10 XP")).toBeVisible();
    await act(async () => {
      finishRefresh?.();
    });
    await screen.findByText("Lv.2");
    expect(screen.getByText("0 / 20 XP")).toBeVisible();
    expect(screen.getByRole("link", { name: /今日 \+1 XP/ })).toBeVisible();
    expect(
      await genericCache.get("public:profile-detail:resource-xp-v4:user-1"),
    ).toBeUndefined();
    expect(fetches).toBe(2);
  },
);
