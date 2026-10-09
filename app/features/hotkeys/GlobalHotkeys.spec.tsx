import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { vi } from "vitest";
import ResourceShelf from "~/features/user/UserDetail/ResourceShelf";
import { shelfFixture } from "~/features/user/UserDetail/ResourceShelf.fixture";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import GlobalHotkeys, {
  HotkeyHelpButton,
  HotkeyProvider,
} from "./GlobalHotkeys";

const auth = vi.hoisted(() => ({
  isAuthenticated: true,
  isSuperuser: false,
  signOut: vi.fn(),
}));
beforeEach(() => {
  auth.isAuthenticated = true;
  auth.isSuperuser = false;
  auth.signOut.mockReset();
});

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: {
      uid: "user-1",
      username: "reader",
      is_superuser: auth.isSuperuser,
    },
    ...auth,
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
  return (
    <output aria-label="現在地">
      {location.pathname}
      {location.search}
    </output>
  );
}

function renderHotkeys(children?: ReactNode, initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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

it("プロフィールでは / でリソースの絞り込みへ優先的にフォーカスし、入力中は干渉しない", async () => {
  const user = userEvent.setup();
  renderHotkeys(
    <ResourceShelf
      namespace={shelfFixture}
      own
      loading={false}
      onRetry={vi.fn()}
    />,
    "/user/reader",
  );
  const input = screen.getByRole("textbox", { name: "本棚を絞り込む" });
  await user.keyboard("/");
  expect(input).toHaveFocus();
  expect(input).toHaveValue("");
  await user.keyboard("/");
  expect(input).toHaveValue("/");
  expect(screen.getByRole("textbox", { name: "入力欄" })).not.toHaveFocus();
});

it("gから始まるショートカットで主要画面へ移動する", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.keyboard("gs");

  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/search",
  );
});

it("g gでゲームに移動し、入力中・未ログインでは移動しない", async () => {
  const user = userEvent.setup();
  renderHotkeys();
  const input = screen.getByRole("textbox", { name: "入力欄" });
  await user.click(input);
  await user.keyboard("gg");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent("/");
  expect(input).toHaveValue("gg");
  await user.keyboard("{Escape}gg");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/game",
  );
});

it("未ログインのg gではゲームへ移動しない", async () => {
  auth.isAuthenticated = false;
  const user = userEvent.setup();
  renderHotkeys();
  await user.keyboard("gg");
  expect(screen.getByRole("status", { name: "現在地" })).not.toHaveTextContent(
    "/game",
  );
});

it.each([
  { loggedIn: true, superuser: true, allowed: true },
  { loggedIn: true, superuser: false, allowed: false },
  { loggedIn: false, superuser: true, allowed: false },
])(
  "g aと管理画面のヘルプを権限に応じて制限する: %j",
  async ({ loggedIn, superuser, allowed }) => {
    auth.isAuthenticated = loggedIn;
    auth.isSuperuser = superuser;
    const user = userEvent.setup();
    renderHotkeys();
    await user.keyboard("ga");
    expect(screen.getByRole("status", { name: "現在地" }).textContent).toBe(
      allowed ? "/admin" : "/",
    );
    await user.keyboard("?");
    expect(screen.queryByText("管理画面へ移動") !== null).toBe(allowed);
  },
);

it("superuserでも入力中のg aは入力として扱う", async () => {
  auth.isSuperuser = true;
  const user = userEvent.setup();
  renderHotkeys();
  const input = screen.getByRole("textbox", { name: "入力欄" });
  await user.click(input);
  await user.keyboard("ga");
  expect(input).toHaveValue("ga");
  expect(screen.getByRole("status", { name: "現在地" }).textContent).toBe("/");
});

it("プロフィールの行をj kで移動してEnterで詳細、Spaceで復習を開く", async () => {
  const user = userEvent.setup();
  renderHotkeys(
    <ResourceShelf
      namespace={shelfFixture}
      own
      loading={false}
      onRetry={vi.fn()}
    />,
    "/user/reader",
  );
  const rows = screen.getAllByRole("row").slice(1);
  await user.keyboard("j");
  expect(rows[0]).toHaveFocus();
  expect(rows[0]).toHaveAttribute("data-hotkey-active", "true");
  await user.keyboard("j");
  expect(rows[1]).toHaveFocus();
  await user.keyboard("k");
  expect(rows[0]).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/resource/10000000-0000-0000-0000-000000000001",
  );
  await user.keyboard(" ");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/review?resource=10000000-0000-0000-0000-000000000001",
  );
});

it("公開プロフィールには復習操作を出さず、入力中に行を移動しない", async () => {
  const user = userEvent.setup();
  renderHotkeys(
    <ResourceShelf
      namespace={shelfFixture}
      own={false}
      loading={false}
      onRetry={vi.fn()}
    />,
    "/user/another",
  );
  expect(
    screen.queryByRole("link", { name: /を復習$/ }),
  ).not.toBeInTheDocument();
  const rows = screen.getAllByRole("row").slice(1);
  await user.keyboard("j ");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/user/another",
  );
  await user.keyboard("/");
  await user.keyboard("jk");
  expect(screen.getByRole("textbox", { name: "本棚を絞り込む" })).toHaveValue(
    "jk",
  );
  expect(rows[0]).not.toHaveFocus();
});

it("g rで復習、g qで全ユーザーのクイズ検索へ移動する", async () => {
  const user = userEvent.setup();
  renderHotkeys();
  await user.keyboard("gr");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/review",
  );
  await user.keyboard("gq");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/search?type=quiz",
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

it("g iでインポートへ移動する", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.keyboard("gi");

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

it("Escで入力欄のフォーカスを解除する", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  const input = screen.getByRole("textbox", { name: "入力欄" });
  await user.click(input);
  expect(input).toHaveFocus();

  await user.keyboard("{Escape}");

  expect(input).not.toHaveFocus();
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
  expect(second.querySelector("svg")).toBeInTheDocument();
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

it("画面固有のhotkeyを共通hotkeyより先に表示する", async () => {
  const user = userEvent.setup();
  renderHotkeys(undefined, "/dashboard?view=study-plans");

  await user.click(screen.getByRole("button", { name: "入力を終了" }));
  await user.keyboard("?");

  const pageHeading = screen.getByRole("heading", { name: "この画面" });
  const globalHeading = screen.getByRole("heading", { name: "共通" });
  expect(
    pageHeading.compareDocumentPosition(globalHeading) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.getByText("currentのチェックを切替")).toBeVisible();
  expect(screen.getByText("入力欄のフォーカスを解除")).toBeVisible();
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

it("スラッシュで現在のページの先頭入力欄へフォーカスする", async () => {
  const user = userEvent.setup();
  renderHotkeys();

  await user.click(screen.getByRole("button", { name: "入力を終了" }));
  await user.keyboard("/");

  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent("/");
  expect(screen.getByRole("textbox", { name: "入力欄" })).toHaveFocus();
});

it("スラッシュではページが指定した入力欄を優先する", async () => {
  const user = userEvent.setup();
  renderHotkeys(
    <input
      aria-label="ページの絞り込み"
      data-page-input-priority
      type="text"
    />,
  );

  await user.click(screen.getByRole("button", { name: "入力を終了" }));
  await user.keyboard("/");

  expect(
    screen.getByRole("textbox", { name: "ページの絞り込み" }),
  ).toHaveFocus();
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

  await waitFor(() => expect(selectNext).toHaveBeenCalledOnce(), {
    timeout: 2000,
  });
  expect(screen.getByRole("tab", { name: "次のタブ" })).toHaveFocus();
});

it("l iはログインへ移動し、タブを変更しない", async () => {
  auth.isAuthenticated = false;
  const next = vi.fn();
  renderHotkeys(
    <div role="tablist">
      <button type="button" role="tab" aria-selected="true">
        現在
      </button>
      <button type="button" role="tab" aria-selected="false" onClick={next}>
        次
      </button>
    </div>,
  );
  await userEvent.setup().keyboard("li");
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/login",
  );
  expect(next).not.toHaveBeenCalled();
});

it("l oはログアウト確認を開き、確認後にログアウトする", async () => {
  auth.signOut.mockResolvedValue(undefined);
  renderHotkeys(undefined, "/review");
  const user = userEvent.setup();
  await user.keyboard("lo");
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(auth.signOut).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "キャンセル" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(auth.signOut).not.toHaveBeenCalled();
  await user.keyboard("lo");
  expect(screen.getByRole("button", { name: "キャンセル" })).toHaveFocus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("button", { name: "ログアウト" })).toHaveFocus();
  expect(auth.signOut).not.toHaveBeenCalled();
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByRole("button", { name: "キャンセル" })).toHaveFocus();
  await user.keyboard("{ArrowRight}{Enter}");
  await waitFor(() => expect(auth.signOut).toHaveBeenCalledOnce());
  expect(screen.getByRole("status", { name: "現在地" }).textContent).toBe("/");
});

it("入力中やログアウト済みではl oを実行しない", async () => {
  auth.isAuthenticated = false;
  renderHotkeys();
  const user = userEvent.setup();
  await user.keyboard("lo");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("textbox", { name: "入力欄" }));
  await user.keyboard("li");
  expect(screen.getByRole("textbox", { name: "入力欄" })).toHaveValue("li");
  expect(screen.getByRole("status", { name: "現在地" }).textContent).toBe("/");
});

it("focusがタブにあってもcurrentの次の項目へ移動する", async () => {
  const user = userEvent.setup();
  renderHotkeys(
    <>
      <button type="button" data-hotkey-item data-hotkey-active="true">
        最初のCard
      </button>
      <button type="button" data-hotkey-item>
        次のCard
      </button>
    </>,
  );

  await user.click(screen.getByRole("button", { name: "入力を終了" }));
  await user.keyboard("j");

  expect(screen.getByRole("button", { name: "次のCard" })).toHaveFocus();
  expect(screen.getByRole("button", { name: "次のCard" })).toHaveAttribute(
    "data-hotkey-active",
    "true",
  );
});

it("クイズ管理ではSpaceでResourceを開閉し配下のクイズも移動する", async () => {
  const user = userEvent.setup();
  const toggleResource = vi.fn();
  const openManagement = vi.fn();
  renderHotkeys(
    <div data-resource-disclosure>
      <button
        type="button"
        data-hotkey-item
        data-hotkey-active="true"
        data-resource-disclosure-trigger
        onClick={toggleResource}
      >
        Resource
      </button>
      <div data-hotkey-item data-resource-quiz-item tabIndex={-1}>
        配下のクイズ
      </div>
      <a
        href="/quiz-management"
        data-resource-management-link
        onClick={(event) => {
          event.preventDefault();
          openManagement();
        }}
      >
        管理
      </a>
    </div>,
    "/dashboard?view=quiz-management",
  );

  await user.keyboard(" ");
  expect(toggleResource).toHaveBeenCalledOnce();

  await user.keyboard("j");
  const childQuiz = screen.getByText("配下のクイズ");
  expect(childQuiz).toHaveFocus();
  expect(childQuiz).toHaveAttribute("data-hotkey-active", "true");

  await user.keyboard("{Enter}");
  expect(openManagement).toHaveBeenCalledOnce();

  await user.keyboard(" ");
  expect(toggleResource).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button", { name: "Resource" })).toHaveFocus();
});

it("Ctrlと数字で指定位置のタブへ移動する", async () => {
  const user = userEvent.setup();
  const selectThird = vi.fn();
  renderHotkeys(
    <div role="tablist">
      <button type="button" role="tab" aria-selected="true">
        1番目
      </button>
      <button type="button" role="tab" aria-selected="false">
        2番目
      </button>
      <button
        type="button"
        role="tab"
        aria-selected="false"
        onClick={selectThird}
      >
        3番目
      </button>
    </div>,
  );

  await user.keyboard("{Control>}3{/Control}");

  expect(selectThird).toHaveBeenCalledOnce();
});

it("プレビュー中は背後のクイズやタブをショートカットで変更しない", async () => {
  const user = userEvent.setup();
  const behind = vi.fn();
  renderHotkeys(
    <>
      <div data-quiz-timeline>
        <div data-quiz-timeline-card data-quiz-open="true">
          <div data-hotkey-item data-hotkey-active="true">
            背後のクイズ
          </div>
          <button type="button" data-quiz-option-index="1" onClick={behind}>
            選択肢
          </button>
          <button type="button" data-quiz-submit onClick={behind}>
            回答する
          </button>
        </div>
        <button type="button" data-quiz-timeline-next onClick={behind}>
          次のクイズ
        </button>
      </div>
      <div role="tablist">
        <button type="button" role="tab" onClick={behind}>
          タブ
        </button>
      </div>
      <dialog open aria-label="単文プレビュー">
        <p>詳細</p>
      </dialog>
    </>,
  );
  await user.keyboard("j1{Enter}{Control>}1{/Control}gr");
  expect(behind).not.toHaveBeenCalled();
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent("/");
});

it("クイズTLではjで次の問題へ移動しEnterで回答する", async () => {
  const user = userEvent.setup();
  const moveNext = vi.fn();
  const submit = vi.fn();
  renderHotkeys(
    <div data-quiz-timeline>
      <div data-quiz-timeline-card data-quiz-open="true">
        <div data-hotkey-item data-hotkey-active="true">
          current quiz
        </div>
        <button type="button" data-quiz-submit onClick={submit}>
          回答する
        </button>
      </div>
      <button type="button" data-quiz-timeline-next onClick={moveNext}>
        次のクイズ
      </button>
    </div>,
  );

  await user.keyboard("j");
  expect(moveNext).toHaveBeenCalledOnce();

  await user.keyboard("{Enter}");
  expect(submit).toHaveBeenCalledOnce();
});

it("非表示のクイズTLは他画面のj移動を横取りしない", async () => {
  const user = userEvent.setup();
  const hiddenMove = vi.fn();
  renderHotkeys(
    <>
      <div hidden>
        <div data-quiz-timeline>
          <button type="button" data-quiz-timeline-next onClick={hiddenMove}>
            次のクイズ
          </button>
        </div>
      </div>
      <button type="button" data-hotkey-item>
        visible item
      </button>
    </>,
  );

  await user.keyboard("j");

  expect(hiddenMove).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "visible item" })).toHaveFocus();
});

it("import画面ではEnterで有効な主操作を実行する", async () => {
  const user = userEvent.setup();
  const runImport = vi.fn();
  renderHotkeys(
    <button type="button" data-page-enter-action onClick={runImport}>
      取り込む
    </button>,
    "/import",
  );

  await user.keyboard("{Enter}");

  expect(runImport).toHaveBeenCalledOnce();
});

it("uとdでページを上下にスクロールする", async () => {
  const user = userEvent.setup();
  const scrollBy = vi.fn();
  renderHotkeys(<main />);
  const main = document.querySelector("main");
  expect(main).not.toBeNull();
  Object.defineProperty(main, "clientHeight", { value: 500 });
  Object.defineProperty(main, "scrollBy", { value: scrollBy });

  await user.keyboard("d");
  expect(scrollBy).toHaveBeenLastCalledWith({ top: 400, behavior: "smooth" });

  await user.keyboard("u");
  expect(scrollBy).toHaveBeenLastCalledWith({ top: -400, behavior: "smooth" });
});

it("import画面のEnterをショートカット一覧に表示する", async () => {
  const user = userEvent.setup();
  renderHotkeys(undefined, "/import");

  await user.click(screen.getByRole("button", { name: "入力を終了" }));
  await user.keyboard("?");

  expect(screen.getByText("選択したファイルをインポート")).toBeVisible();
  expect(screen.getByText("ページを上下にスクロール")).toBeVisible();
});
