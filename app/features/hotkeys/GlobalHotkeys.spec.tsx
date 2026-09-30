import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { vi } from "vitest";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import GlobalHotkeys, {
  HotkeyHelpButton,
  HotkeyProvider,
} from "./GlobalHotkeys";

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { uid: "user-1", username: "reader" },
  }),
}));

vi.mock("~/shared/history/hooks", () => ({
  useHistory: () => ({
    histories: [
      { id: 1, title: "最初の履歴", url: "/tanbun/1", timestamp: 2 },
      { id: 2, title: "次の履歴", url: "/resource/2", timestamp: 1 },
    ],
  }),
}));

function Location() {
  const location = useLocation();
  return <output aria-label="現在地">{location.pathname}</output>;
}

function renderHotkeys(children?: ReactNode) {
  return render(
    <MemoryRouter>
      <HistoryPanelProvider>
        <HotkeyProvider>
          <input aria-label="入力欄" />
          <input aria-label="検索入力" data-global-search-input />
          <button type="button">入力を終了</button>
          {children}
          <GlobalHotkeys />
          <Location />
        </HotkeyProvider>
      </HistoryPanelProvider>
    </MemoryRouter>,
  );
}

it("gから始まるショートカットで主要画面へ移動する", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.keyboard("gs");

  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/search",
  );
});

it("数字キーでcurrentなクイズの選択肢を切り替える", async () => {
  const user = userEvent.setup();
  const toggle = vi.fn();
  renderHotkeys(
    <div data-quiz-timeline-card>
      <button type="button" data-hotkey-item data-hotkey-active="true">
        current quiz
      </button>
      <button type="button" data-quiz-option-index="1" onClick={toggle}>
        option 1
      </button>
    </div>,
  );

  await user.keyboard("1");

  expect(toggle).toHaveBeenCalledOnce();
});

it("g pで自分のプロフィールへ移動する", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.keyboard("gp");

  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/user/reader",
  );
});

it("g nで通知へ移動する", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.keyboard("gn");

  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/notifications",
  );
});

it("g +で読書メモ取り込みへ移動する", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.keyboard("g+");

  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/import",
  );
});

it("入力中はショートカットが干渉しない", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  const input = screen.getByRole("textbox", { name: "入力欄" });
  await user.click(input);
  await user.keyboard("gs");

  expect(input).toHaveValue("gs");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent("/");
});

it("履歴を開いてjとkとEnterで移動する", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.keyboard("gh");

  const first = await screen.findByRole("link", { name: "最初の履歴" });
  const second = screen.getByRole("link", { name: "次の履歴" });
  expect(first).toHaveFocus();

  await user.keyboard("j");
  expect(second).toHaveFocus();
  expect(second).toHaveAttribute("data-hotkey-active", "true");
  expect(first).not.toHaveAttribute("data-hotkey-active");

  await user.keyboard("k");
  expect(first).toHaveFocus();
  expect(first).toHaveAttribute("data-hotkey-active", "true");
  expect(second).not.toHaveAttribute("data-hotkey-active");

  await user.keyboard("j");

  await user.keyboard("{Enter}");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/resource/2",
  );
  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

it("疑問符でショートカット一覧を開く", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.click(screen.getByRole("button", { name: "入力を終了" }));
  await user.keyboard("?");

  expect(
    screen.getByRole("heading", { name: "キーボードショートカット" }),
  ).toBeVisible();
});

it("ヘルプボタンでショートカット一覧を開く", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <HistoryPanelProvider>
        <HotkeyProvider>
          <HotkeyHelpButton />
        </HotkeyProvider>
      </HistoryPanelProvider>
    </MemoryRouter>,
  );

  await user.click(
    screen.getByRole("button", { name: "キーボードショートカットを開く" }),
  );

  expect(
    screen.getByRole("heading", { name: "キーボードショートカット" }),
  ).toBeVisible();
});

it("スラッシュで検索へ移動して入力欄へフォーカスする", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.click(screen.getByRole("button", { name: "入力を終了" }));
  await user.keyboard("/");

  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/search",
  );
  await waitFor(() => {
    expect(screen.getByRole("textbox", { name: "検索入力" })).toHaveFocus();
  });
});

it("hとlで前後のタブへ移動する", async () => {
  const user = userEvent.setup();
  const selectNext = vi.fn();
  render(
    <MemoryRouter>
      <HistoryPanelProvider>
        <HotkeyProvider>
          <div role="tablist">
            <button type="button" role="tab" aria-selected="true">
              現在のタブ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="false"
              onClick={selectNext}
            >
              次のタブ
            </button>
          </div>
          <GlobalHotkeys />
        </HotkeyProvider>
      </HistoryPanelProvider>
    </MemoryRouter>,
  );

  await user.keyboard("l");

  expect(selectNext).toHaveBeenCalledOnce();
  expect(screen.getByRole("tab", { name: "次のタブ" })).toHaveFocus();
});
