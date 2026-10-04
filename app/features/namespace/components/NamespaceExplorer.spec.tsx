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
      { path: "/entry/:entryId", element: <Location /> },
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

  it("Resourceの統計とクイズ導線だけをResource行に表示する", () => {
    renderExplorer();

    expect(screen.getByText("2 Resources")).toBeInTheDocument();
    expect(screen.getByText("120文")).toBeInTheDocument();
    expect(screen.getByText("35語")).toBeInTheDocument();
    expect(screen.getByText("210関係")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "国家のクイズ一覧" }),
    ).toHaveAttribute(
      "href",
      `/dashboard?view=quiz-management&resource=${resourceId}`,
    );
    expect(
      screen.queryByRole("link", { name: "国家のEntryを開く" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^国家プラトン/ })).toHaveAttribute(
      "data-hotkey-item",
    );
    expect(
      screen.queryByRole("button", { name: /グリッド/ }),
    ).not.toBeInTheDocument();
  });

  it("Entryの開閉とは独立した詳細リンクを表示する", () => {
    renderExplorer();

    const link = screen.getByRole("link", { name: "哲学のEntryを開く" });
    expect(link).toHaveAttribute("href", `/entry/${folderId}`);
    expect(link.closest("button")).toBeNull();
  });

  it("Entryをcurrent対象にしてEnterで開閉する", async () => {
    const user = userEvent.setup();
    renderExplorer();

    const entry = screen.getByRole("button", { name: /哲学.*2 Resources/ });
    expect(entry).toHaveAttribute("data-hotkey-item");
    expect(entry).toHaveClass(
      "data-[hotkey-active=true]:outline-2",
      "data-[hotkey-active=true]:outline-foreground",
    );

    entry.focus();
    await user.keyboard("{Enter}");
    expect(screen.queryByText("国家")).not.toBeInTheDocument();
  });

  it("Resource行をクリックすると詳細へ移動する", async () => {
    const user = userEvent.setup();
    renderExplorer();

    await user.click(screen.getByRole("link", { name: /^国家プラトン/ }));

    expect(screen.getByText(`/resource/${resourceId}`)).toBeInTheDocument();
  });

  it("タイトルまたは著者でリソースを絞り込む", async () => {
    const user = userEvent.setup();
    renderExplorer();

    const search = screen.getByRole("textbox", {
      name: "リソースを絞り込む",
    });
    expect(search.parentElement).toHaveClass("sticky", "top-0");
    await user.type(search, "アリストテレス");

    expect(screen.getByText("ニコマコス倫理学")).toBeInTheDocument();
    expect(screen.queryByText("国家")).not.toBeInTheDocument();
    expect(screen.getAllByText("1 Resources")).toHaveLength(2);
  });
});
