import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { Outlet, RouterProvider, createMemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { historyCache } from "../lib/indexed";
import { useHistory } from "./hooks";
import History from "./index";

beforeEach(async () => {
  await historyCache.clear();
});

const knowdeTitle = "knowde title";
const userTitle = "user title";
const resourceTitle = "resource title";

function mkrouter(initial: string) {
  return createMemoryRouter(
    [
      {
        path: "/",
        Component: () => (
          <div>
            <History />
            <Outlet />
          </div>
        ),
        children: [
          { index: true, element: <div>Home Page</div> },
          {
            path: "/other",
            Component: () => {
              const { addHistory } = useHistory();
              React.useEffect(() => {
                addHistory({ title: "other" });
              }, [addHistory]);
              return <div>Other Page</div>;
            },
          },
          {
            path: "/search",
            Component: () => {
              const { addHistory } = useHistory();
              React.useEffect(() => {
                addHistory({ title: "testquery" });
              }, [addHistory]);
              return <div>Search Page</div>;
            },
          },
          {
            path: "tanbun/:tanbunId",
            Component: () => {
              const { addHistory } = useHistory();
              React.useEffect(() => {
                addHistory({ title: knowdeTitle });
              }, [addHistory]);
              return <div>Tanbun Detail Page</div>;
            },
          },
          {
            path: "user/:userId",
            Component: () => {
              const { addHistory } = useHistory();
              React.useEffect(() => {
                addHistory({ title: userTitle });
              }, [addHistory]);
              return <div>User Profile Page</div>;
            },
          },
          {
            path: "resource/:resourceId",
            Component: () => {
              const { addHistory } = useHistory();
              React.useEffect(() => {
                addHistory({ title: resourceTitle });
              }, [addHistory]);
              return <div>Resource Page</div>;
            },
          },
        ],
      },
    ],
    {
      initialEntries: [initial],
    },
  );
}

describe("history", () => {
  describe("URLを履歴に追加", () => {
    it("検索画面の履歴", async () => {
      const user = userEvent.setup();
      const router = mkrouter("/search?q=testquery");
      render(<RouterProvider router={router} />);
      act(() => {
        router.navigate("/");
      });

      const historyItem = await screen.findByText("testquery");
      expect(historyItem).toBeInTheDocument(); // titleが表示される
      const parentDiv = historyItem.parentElement;
      expect(parentDiv?.querySelector("svg")).toBeInTheDocument();
      await user.click(historyItem);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/search");
        expect(router.state.location.search).toBe("?q=testquery");
      });
    });

    it("knowde詳細画面履歴", async () => {
      const user = userEvent.setup();
      const tanbunId = "d9353547-6298-404d-b013-d61713117c32";
      const router = mkrouter(`/tanbun/${tanbunId}`);
      render(<RouterProvider router={router} />);
      act(() => {
        router.navigate("/");
      });
      const historyItem = await screen.findByText(knowdeTitle);
      const parentDiv = historyItem.parentElement;
      expect(parentDiv?.querySelector("svg")).toBeInTheDocument();
      await user.click(historyItem);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(`/tanbun/${tanbunId}`);
      });
    });
    it("userプロフィール画面", async () => {
      const user = userEvent.setup();
      const userId = "some-user-id";
      const router = mkrouter(`/user/${userId}`);
      render(<RouterProvider router={router} />);
      act(() => {
        router.navigate("/");
      });
      const historyItem = await screen.findByText(userTitle);
      expect(historyItem).toBeInTheDocument();
      const parentDiv = historyItem.parentElement;
      expect(parentDiv?.querySelector("svg")).toBeInTheDocument();
      await user.click(historyItem);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(`/user/${userId}`);
      });
    });
    it("resource画面", async () => {
      const user = userEvent.setup();
      const resourceId = "some-resource-id";
      const router = mkrouter(`/resource/${resourceId}`);
      render(<RouterProvider router={router} />);
      act(() => {
        router.navigate("/");
      });
      const historyItem = await screen.findByText(resourceTitle);
      expect(historyItem).toBeInTheDocument();
      const parentDiv = historyItem.parentElement;
      expect(parentDiv?.querySelector("svg")).toBeInTheDocument();
      await user.click(historyItem);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(`/resource/${resourceId}`);
      });
    });
    it("その他の画面", async () => {
      const user = userEvent.setup();
      const router2 = mkrouter("/other");
      render(<RouterProvider router={router2} />);
      act(() => {
        router2.navigate("/");
      });
      const historyItem = await screen.findByText("other");
      expect(historyItem).toBeInTheDocument();
      // iconなし
      const parentDiv = historyItem.parentElement;
      expect(parentDiv?.querySelector("svg")).not.toBeInTheDocument();
      await user.click(historyItem);
      await waitFor(() => {
        expect(router2.state.location.pathname).toBe("/other");
      });
    });
    it("履歴間の移動と重複削除", async () => {
      const user = userEvent.setup();
      const router = mkrouter("/");
      render(<RouterProvider router={router} />);

      await act(() => router.navigate("/tanbun/1"));
      await act(() => router.navigate("/user/1"));
      await act(() => router.navigate("/resource/1"));
      await act(() => router.navigate("/"));
      await waitFor(async () => {
        const historyItems = await screen.findAllByRole("listitem");
        expect(historyItems).toHaveLength(3);
        expect(historyItems[0]).toHaveTextContent(resourceTitle);
        expect(historyItems[1]).toHaveTextContent(userTitle);
        expect(historyItems[2]).toHaveTextContent(knowdeTitle);
      });
      await act(() => router.navigate("/tanbun/1")); // 最初のページに再訪
      await act(() => router.navigate("/"));

      // knowdeが一番上に移動している
      await waitFor(async () => {
        const historyItems = await screen.findAllByRole("listitem");
        expect(historyItems).toHaveLength(3);
        expect(historyItems[0]).toHaveTextContent(knowdeTitle);
        expect(historyItems[1]).toHaveTextContent(resourceTitle);
        expect(historyItems[2]).toHaveTextContent(userTitle);
      });

      // 履歴をクリックして遷移
      const resourceHistoryItem = screen.getByText(resourceTitle);
      await user.click(resourceHistoryItem);
      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/resource/1");
      });
    });
  });
});
