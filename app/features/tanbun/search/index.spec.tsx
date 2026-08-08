import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { RouterProvider, createMemoryRouter } from "react-router";
import { vi } from "vitest";
import { SearchByTextTanbunGetType } from "~/shared/generated/fastAPI.schemas";
import {
  getSearchByTextTanbunGetMockHandler,
  getSearchByTextTanbunGetResponseMock,
} from "~/shared/generated/tanbun/tanbun.msw";
import TanbunSearch from ".";

// MSWサーバーのセットアップ
const server = setupServer(
  getSearchByTextTanbunGetMockHandler(
    getSearchByTextTanbunGetResponseMock({ total: 1 }),
  ),
);
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

// 履歴管理フックのモック
const mockAddHistory = vi.fn();
vi.mock("~/shared/history/hooks", () => ({
  useHistory: () => ({
    addHistory: mockAddHistory,
  }),
}));

function mkrouter(initial: string) {
  return createMemoryRouter(
    [
      {
        path: "/tanbun/search",
        Component: TanbunSearch,
      },
    ],
    {
      initialEntries: [initial],
    },
  );
}

describe("Tanbun Search", () => {
  // beforeEach(() => {
  //   vi.useFakeTimers();
  // });
  //
  // afterEach(() => {
  //   vi.runOnlyPendingTimers();
  //   vi.useRealTimers();
  // });
  //
  it("大きいページから小さいページへの遷移時にcurrent pageが範囲外にならない", async () => {
    const user = userEvent.setup();
    const total = 500;
    const pageSize = 50;
    const lastPage = total / pageSize; // 10

    const mock = getSearchByTextTanbunGetResponseMock();
    server.use(
      getSearchByTextTanbunGetMockHandler({
        total: total,
        data: Array(total).fill(mock.data[0]),
        // @ts-ignore
        owners: [],
      }),
    );

    // const res = await fetch("https://knowde.onrender.com/tanbun/?size=10");
    // console.log(await res.json());
    const router = mkrouter(`/tanbun/search?size=${pageSize}`);
    render(<RouterProvider router={router} />);

    // page=10に移動
    const pageLink = await screen.findByRole("link", {
      name: String(lastPage),
    });
    await user.click(pageLink);
    await waitFor(() => {
      expect(router.state.location.search).toContain(`page=${lastPage}`);
    });

    // 検索結果が10件(1ページ)しかない状態に変える
    const smTotal = 1;
    server.use(
      getSearchByTextTanbunGetMockHandler({
        total: smTotal,
        data: Array(smTotal).fill(mock.data[0]),
        // @ts-ignore
        owners: [],
      }),
    );
    // const res2 = await fetch("https://knowde.onrender.com/tanbun/?size=10");
    // console.log(await res2.json());
    const searchInput = await screen.findByPlaceholderText(
      "検索文字列を入力...",
    );
    await user.type(searchInput, "new query");
    await waitFor(() => {
      expect(router.state.location.search).toContain("page=1");
      // ここでdebounceを待つことになってpagenavgが変化するっぽい
      expect(router.state.location.search).toContain("q=new+query");
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: String(lastPage) }),
      ).not.toBeInTheDocument();

      expect(screen.queryByRole("link", { name: "1" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "2" })).not.toBeInTheDocument();
    });
  });

  describe("URL -> State同期", () => {
    it("URLのクエリパラメータでコンポーネントが初期化される", async () => {
      server.use(
        getSearchByTextTanbunGetMockHandler(
          getSearchByTextTanbunGetResponseMock({ total: 1 }),
        ),
      );

      const user = userEvent.setup();
      const router = mkrouter(
        "/tanbun/search?q=initial&type=REGEX&desc=false&n_detail=2&n_premise=3",
      );
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        const { search } = router.state.location;
        expect(search).toContain("q=initial");
        expect(search).toContain("type=REGEX");
        expect(search).toContain("desc=false");
        expect(search).toContain("n_detail=2");
        expect(search).toContain("n_premise=3");
      });

      expect(await screen.findByDisplayValue("initial")).toBeInTheDocument();
      const settingsButton = screen.getByRole("button", { name: "Settings" });
      expect(settingsButton).toBeInTheDocument();
      await user.click(settingsButton);
      await waitFor(() => {
        expect(settingsButton).toHaveAttribute("data-state", "open");
      });

      expect(
        await screen.findByRole("checkbox", { name: "降順" }),
      ).not.toBeChecked();
      expect(
        await screen.findByRole("combobox", { name: "マッチ方式" }),
      ).toHaveValue(SearchByTextTanbunGetType.REGEX);

      const detailLabel = await screen.findByText("詳細数");
      const detailContainer = detailLabel.closest("div");
      // @ts-ignore
      const detailSlider = within(detailContainer).getByRole("slider");
      expect(detailSlider).toHaveAttribute("aria-valuenow", "2");

      const premiseLabel = await screen.findByText("前提数");
      const premiseContainer = premiseLabel.closest("div");
      // @ts-ignore
      const premiseSlider = within(premiseContainer).getByRole("slider");
      expect(premiseSlider).toHaveAttribute("aria-valuenow", "3");
    });
  });

  describe("State -> URL同期", () => {
    it("検索入力によってURLのクエリパラメータが更新される", async () => {
      const router = mkrouter("/tanbun/search");
      render(<RouterProvider router={router} />);

      const user = userEvent.setup();

      const searchInput = await screen.findByPlaceholderText(
        "検索文字列を入力...",
      );
      await user.type(searchInput, "sync test");

      await waitFor(() => {
        expect(router.state.location.search).toContain("q=sync+test");
      });
    });
  });
});
