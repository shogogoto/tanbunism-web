import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { vi } from "vitest";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import GlobalHotkeys from "./GlobalHotkeys";

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ isAuthenticated: true }),
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

function renderHotkeys() {
  return render(
    <MemoryRouter>
      <HistoryPanelProvider>
        <input aria-label="入力欄" />
        <input aria-label="検索入力" data-global-search-input />
        <button type="button">入力を終了</button>
        <GlobalHotkeys />
        <Location />
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

it("入力中はショートカットが干渉しない", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  const input = screen.getByRole("textbox", { name: "入力欄" });
  await user.click(input);
  await user.keyboard("gs");

  expect(input).toHaveValue("gs");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent("/");
});

it("履歴を開いて上下キーとEnterで移動する", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.keyboard("gh");

  const first = await screen.findByRole("link", { name: "最初の履歴" });
  const second = screen.getByRole("link", { name: "次の履歴" });
  expect(first).toHaveFocus();

  await user.keyboard("{ArrowDown}");
  expect(second).toHaveFocus();

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

it("角括弧で前後のタブへ移動する", async () => {
  const user = userEvent.setup();
  const selectNext = vi.fn();
  render(
    <MemoryRouter>
      <HistoryPanelProvider>
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
      </HistoryPanelProvider>
    </MemoryRouter>,
  );

  await user.keyboard("]");

  expect(selectNext).toHaveBeenCalledOnce();
  expect(screen.getByRole("tab", { name: "次のタブ" })).toHaveFocus();
});
