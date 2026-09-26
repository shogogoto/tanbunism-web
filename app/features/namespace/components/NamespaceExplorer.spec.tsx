import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { useGetNamaspaceNamespaceGet } from "~/shared/generated/entry/entry";
import type { NameSpace } from "~/shared/generated/fastAPI.schemas";
import NamespaceExplorer, { transformToTreeData } from "./NamespaceExplorer";

const folderId = "10000000-0000-0000-0000-000000000000";
const nestedFolderId = "20000000-0000-0000-0000-000000000000";
const resourceId = "30000000-0000-0000-0000-000000000000";
const nestedResourceId = "40000000-0000-0000-0000-000000000000";

const namespace = {
  g: {
    directed: true,
    multigraph: false,
    graph: {},
    nodes: [
      { id: { uid: folderId, name: "哲学" } },
      { id: { uid: nestedFolderId, name: "古代" } },
      {
        id: {
          uid: resourceId,
          name: "国家",
          authors: ["プラトン"],
          published: null,
        },
      },
      {
        id: {
          uid: nestedResourceId,
          name: "ニコマコス倫理学",
          authors: ["アリストテレス"],
          published: null,
        },
      },
    ],
    edges: [
      { source: { uid: folderId }, target: { uid: resourceId } },
      { source: { uid: folderId }, target: { uid: nestedFolderId } },
      { source: { uid: nestedFolderId }, target: { uid: nestedResourceId } },
    ],
  },
  roots_: {},
  user_id: "user-1",
  stats: {
    [resourceId.replaceAll("-", "")]: {
      n_sentence: 120,
      n_term: 35,
      n_edge: 210,
    },
  },
} as unknown as NameSpace;

function Location() {
  const location = useLocation();
  return <div>{location.pathname}</div>;
}

function renderExplorer() {
  const nsprops = {
    data: { data: namespace },
    error: undefined,
    isLoading: false,
    mutate: vi.fn(),
  } as unknown as ReturnType<typeof useGetNamaspaceNamespaceGet>;
  const router = createMemoryRouter(
    [
      {
        path: "/dashboard",
        element: <NamespaceExplorer nsprops={nsprops} />,
      },
      { path: "/resource/:resourceId", element: <Location /> },
      { path: "/quiz/list", element: <Location /> },
    ],
    { initialEntries: ["/dashboard"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("NamespaceExplorer", () => {
  it("Entryの配下にあるResourceを再帰的に数える", () => {
    const [folder] = transformToTreeData(namespace);

    expect(folder.resourceCount).toBe(2);
    expect(
      folder.children?.find(({ id }) => id === nestedFolderId)?.resourceCount,
    ).toBe(1);
  });

  it("Resourceの統計とクイズ導線を一覧に表示する", () => {
    renderExplorer();

    expect(screen.getByText("2 Resources")).toBeInTheDocument();
    expect(screen.getByText("120文")).toBeInTheDocument();
    expect(screen.getByText("35語")).toBeInTheDocument();
    expect(screen.getByText("210関係")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "国家のクイズ一覧" }),
    ).toHaveAttribute("href", `/quiz/list?resource=${resourceId}`);
    expect(
      screen.queryByRole("button", { name: /グリッド/ }),
    ).not.toBeInTheDocument();
  });

  it("Resource行をクリックすると詳細へ移動する", async () => {
    const user = userEvent.setup();
    renderExplorer();

    await user.click(screen.getByRole("link", { name: /^国家プラトン/ }));

    expect(screen.getByText(`/resource/${resourceId}`)).toBeInTheDocument();
  });
});
