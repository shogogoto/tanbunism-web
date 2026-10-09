import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import { SWRConfig, useSWRConfig } from "swr";
import { beforeEach, expect, it, vi } from "vitest";
import { markTanbunSeen } from "~/features/review/api";
import { GamePlay } from ".";
import { adventureAccessKey } from "./access";
import { loadDungeon } from "./api";
import { enterDungeon, newSave } from "./domain";
import type { GameState } from "./state";

let available = true;
let consumeCount = 0;
let state: GameState = { revision: 0, save: newSave() };
const server = setupServer(
  http.get("*/game/state", () => HttpResponse.json(state)),
  http.put("*/game/state", async ({ request }) => {
    const body = (await request.json()) as GameState & {
      consume_access: boolean;
    };
    if (body.revision !== state.revision)
      return HttpResponse.json({ detail: "競合" }, { status: 409 });
    if (body.consume_access) {
      if (!available)
        return HttpResponse.json(
          { detail: "別端末で使用済み" },
          { status: 409 },
        );
      available = false;
      consumeCount++;
    }
    state = { revision: state.revision + 1, save: body.save };
    return HttpResponse.json(state);
  }),
  http.get("*/game/adventure-access", () =>
    HttpResponse.json({
      available,
      server_now: Date.now(),
      next_available_at: Date.now() + 600000,
    }),
  ),
  http.post("*/game/adventure-access/consume", () => {
    consumeCount++;
    if (!available)
      return HttpResponse.json({ detail: "使用済み" }, { status: 409 });
    available = false;
    return HttpResponse.json({
      available,
      server_now: Date.now(),
      next_available_at: Date.now() + 600000,
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

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
  available = true;
  consumeCount = 0;
  state = { revision: 0, save: newSave() };
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
it("does not enter or lose local progress when another device consumed the right", async () => {
  server.use(
    http.put("*/game/state", () =>
      HttpResponse.json({ detail: "別端末で使用済み" }, { status: 409 }),
    ),
  );
  renderGame();
  await enter();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "別端末で使用済み",
  );
  expect(state.save.run).toBeUndefined();
});
function renderGame() {
  return render(
    <MemoryRouter>
      <SWRConfig value={{ provider: () => new Map() }}>
        <GamePlay userId="player" />
        <RefreshAccess />
      </SWRConfig>
    </MemoryRouter>,
  );
}
function RefreshAccess() {
  const { mutate } = useSWRConfig();
  return (
    <button
      type="button"
      onClick={() => void mutate(adventureAccessKey("player"))}
    >
      冒険権を再確認
    </button>
  );
}
async function enter() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "冒険" }));
  await user.click(
    await screen.findByRole("button", { name: "ダンジョンに入る" }),
  );
  return user;
}
it("records seen knowledge, takes quiz damage and restores the run after remount", async () => {
  const view = renderGame();
  const user = await enter();
  expect(consumeCount).toBe(1);
  await user.click(
    await screen.findByRole("button", { name: "見たよ · この道へ" }),
  );
  expect(
    await screen.findByRole("heading", { name: /敵と遭遇/ }),
  ).toBeInTheDocument();
  expect(markTanbunSeen).toHaveBeenCalledWith("sentence");
  await user.click(screen.getByRole("button", { name: "不正解を送信" }));
  expect(
    await screen.findByText("不正解 · あなたのHP −11"),
  ).toBeInTheDocument();
  expect(state.save.run).toMatchObject({
    hp: 24,
    phase: "battle",
    moves: 1,
    readIds: ["sentence"],
  });
  const loadsBeforeRemount = vi.mocked(loadDungeon).mock.calls.length;
  view.unmount();
  renderGame();
  await user.click(await screen.findByRole("button", { name: "冒険を続ける" }));
  expect(
    await screen.findByRole("heading", { name: /敵と遭遇/ }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("dialog")).getByText("HP 24/35"),
  ).toBeInTheDocument();
  const revisionBeforeClosing = state.revision;
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(state.revision).toBe(revisionBeforeClosing);
  expect(
    screen.getByRole("button", { name: "戦闘を開く" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "現在地 · 第1地点" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /1 · 現在地.*知識の進路/ }),
  ).toBeInTheDocument();
  expect(loadDungeon).toHaveBeenCalledTimes(loadsBeforeRemount);
});

it("opens a menu and preserves the adventure when switching sections", async () => {
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  state = { revision: 1, save };
  renderGame();
  const user = userEvent.setup();
  await screen.findByRole("button", { name: "冒険を続ける" });
  expect(
    screen.queryByRole("button", { name: "行き先を変更する" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "ステータス" }));
  expect(screen.getByText("ダンジョン攻略 0周")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "ゲームメニュー" }));
  await user.click(screen.getByRole("button", { name: "アイテム" }));
  expect(
    screen.getByText(/武器・アイテム機能は今後追加予定/),
  ).toBeInTheDocument();
  expect(state.revision).toBe(1);
  expect(state.save.run?.hp).toBe(35);
});
it("does not advance when the seen API fails", async () => {
  vi.mocked(markTanbunSeen).mockRejectedValue(new Error("記録失敗"));
  renderGame();
  const user = await enter();
  await user.click(
    await screen.findByRole("button", { name: "見たよ · この道へ" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("記録失敗");
  expect(state.save.run).toMatchObject({ phase: "path", moves: 0 });
});

it("admin unlock is applied without healing or erasing progress", async () => {
  const save = enterDungeon(newSave(), "book", "テストの本", 1);
  if (!save.run) throw new Error("Missing run");
  state = {
    revision: 1,
    save: {
      ...save,
      run: { ...save.run, hp: 24, moves: 5, kills: 2, phase: "rest" },
    },
  };
  available = false;
  renderGame();
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "冒険を続ける" }));
  expect(
    await screen.findByRole("button", { name: "あと10分" }),
  ).toBeDisabled();
  available = true;
  await user.click(screen.getByRole("button", { name: "冒険権を再確認" }));
  await user.click(await screen.findByRole("button", { name: "冒険を再開" }));
  expect(await screen.findByText("第1地点へ · 次の進路")).toBeInTheDocument();
  expect(state.save.run).toMatchObject({
    hp: 24,
    moves: 0,
    kills: 2,
    phase: "path",
  });
  expect(consumeCount).toBe(1);
});
