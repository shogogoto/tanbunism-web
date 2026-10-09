import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SWRConfig } from "swr";
import { beforeEach, expect, it, vi } from "vitest";
import { markTanbunSeen } from "~/features/review/api";
import { GamePlay } from ".";
import { loadDungeon } from "./api";
import { readGameSave } from "./storage";

vi.mock("~/features/gamification/ResourceGrowth", () => ({
  useResourceGrowth: () => ({
    data: {
      resources: [
        {
          resource_id: "book",
          resource_name: "テストの本",
          power: 20,
          level: 1,
        },
      ],
    },
  }),
}));
vi.mock("~/shared/generated/gamification/gamification", () => ({
  useGetLearningProgressUserUserIdLearningProgressGet: () => ({
    data: { status: 200, data: { level: 1 } },
  }),
}));
vi.mock("~/features/gamification/invalidate", () => ({
  invalidateGamification: vi.fn(async () => undefined),
}));
vi.mock("~/features/tanbun/detail/Preview", () => ({
  useTanbunPreview: () => ({ openPreview: vi.fn(), preview: null }),
}));
vi.mock("~/features/quiz/QuizAttempt", () => ({
  default: ({ onAnswered }: { onAnswered: (correct: boolean) => void }) => (
    <button type="button" onClick={() => onAnswered(false)}>
      不正解を送信
    </button>
  ),
}));
vi.mock("~/features/review/api", () => ({ markTanbunSeen: vi.fn() }));
vi.mock("./api", () => ({ loadDungeon: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.mocked(loadDungeon).mockResolvedValue({
    knowledge: [{ uid: "sentence", sentence: "知識の進路" }],
    quizzes: [
      {
        quiz_id: "quiz",
        quiz_type: "sent2term",
        prompt: { subject: "条件", answer_kind: "term" },
        statement: "条件",
        options: { yes: "抽象化" },
        correct: ["yes"],
        created: "2026-10-08T00:00:00Z",
        no_correct_option: false,
      },
    ],
  });
  vi.mocked(markTanbunSeen).mockResolvedValue({
    sentence_id: "sentence",
    seen_on: "2026-10-08",
    exposure_count: 1,
    recorded: true,
  });
  vi.spyOn(Math, "random").mockReturnValue(0.1);
});
function renderGame() {
  return render(
    <MemoryRouter>
      <SWRConfig value={{ provider: () => new Map() }}>
        <GamePlay userId="player" />
      </SWRConfig>
    </MemoryRouter>,
  );
}
async function enter() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /テストの本/ }));
  await user.click(
    await screen.findByRole("button", { name: "ダンジョンに入る" }),
  );
  return user;
}
it("records seen knowledge, takes quiz damage and restores the run after remount", async () => {
  const view = renderGame();
  const user = await enter();
  await user.click(
    await screen.findByRole("button", { name: "見たよ · この道へ" }),
  );
  expect(
    await screen.findByRole("heading", { name: /敵と遭遇/ }),
  ).toBeInTheDocument();
  expect(markTanbunSeen).toHaveBeenCalledWith("sentence");
  await user.click(screen.getByRole("button", { name: "不正解を送信" }));
  expect(await screen.findByText("不正解 · HP −11")).toBeInTheDocument();
  expect(readGameSave("player").run).toMatchObject({
    hp: 24,
    phase: "battle",
    moves: 1,
  });
  view.unmount();
  renderGame();
  expect(
    await screen.findByRole("heading", { name: /敵と遭遇/ }),
  ).toBeInTheDocument();
  expect(screen.getByText("HP 24/35")).toBeInTheDocument();
});
it("does not advance when the seen API fails", async () => {
  vi.mocked(markTanbunSeen).mockRejectedValue(new Error("記録失敗"));
  renderGame();
  const user = await enter();
  await user.click(
    await screen.findByRole("button", { name: "見たよ · この道へ" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("記録失敗");
  expect(readGameSave("player").run).toMatchObject({ phase: "path", moves: 0 });
});
