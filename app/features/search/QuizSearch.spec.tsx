import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import GlobalHotkeys, {
  HotkeyProvider,
} from "~/features/hotkeys/GlobalHotkeys";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import UnifiedSearch from ".";
import SearchHeaderControls from "./SearchHeaderControls";

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));
vi.mock("~/shared/history/hooks", () => ({
  useHistory: () => ({ histories: [] }),
}));
let requested: URL[] = [];
const server = setupServer(
  http.get("*/quiz/search", ({ request }) => {
    requested.push(new URL(request.url));
    return HttpResponse.json({
      total: 1,
      data: [
        {
          target_score: 42,
          resource_id: "resource-1",
          resource_name: "論理学",
          creator_id: "reader",
          creator_username: "reader",
          quiz: {
            quiz_id: "quiz-1",
            quiz_type: "term2sent",
            prompt: { subject: "推論", answer_kind: "sentence" },
            statement: "推論",
            options: {},
            correct: [],
            no_correct_option: false,
            created: "2026-10-05T00:00:00Z",
          },
        },
      ],
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  requested = [];
  server.resetHandlers();
});
afterAll(() => server.close());

it("検索のクイズタブから匿名でも対象スコアとResource・作成者を確認できる", async () => {
  render(
    <MemoryRouter initialEntries={["/search?type=quiz&q=推論"]}>
      <HistoryPanelProvider>
        <HotkeyProvider>
          <SearchHeaderControls />
          <UnifiedSearch />
          <GlobalHotkeys />
        </HotkeyProvider>
      </HistoryPanelProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole("tab", { name: "クイズ" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(await screen.findByText("スコア 42")).toBeVisible();
  expect(requested[0].searchParams.get("q")).toBe("推論");
  expect(screen.getByRole("link", { name: "論理学" })).toHaveAttribute(
    "href",
    "/resource/resource-1",
  );
  expect(screen.getByRole("link", { name: "@reader" })).toHaveAttribute(
    "href",
    "/user/reader",
  );
  const question = screen.getByRole("button", { name: /推論/ });
  const card = question.closest("article");
  expect(card).toHaveAttribute("data-hotkey-item");
  expect(card).not.toHaveAttribute("data-hotkey-active");
  expect(question).not.toHaveAttribute("data-hotkey-item");
  const keyboard = userEvent.setup();
  await keyboard.click(question);
  expect(card).not.toHaveAttribute("data-hotkey-active");
  await keyboard.click(question);
  await keyboard.keyboard("j");
  expect(card).toHaveAttribute("data-hotkey-active", "true");
  expect(card).toHaveFocus();
  expect(card).toHaveClass("data-[hotkey-active=true]:ring-2");
  await keyboard.keyboard("{Enter}");
  expect(
    screen.getByRole("link", { name: "ログインして回答する" }),
  ).toHaveAttribute("href", "/login");
});

it("検索失敗を表示する", async () => {
  server.use(
    http.get("*/quiz/search", () => new HttpResponse(null, { status: 503 })),
  );
  render(
    <MemoryRouter initialEntries={["/search?type=quiz"]}>
      <UnifiedSearch />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "クイズを取得できませんでした。",
  );
});
