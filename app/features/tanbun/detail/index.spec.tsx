import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import MainView from "./MainView";
import { fixtureDetail1 } from "./fixture";

const addHistory = vi.hoisted(() => vi.fn());

vi.mock("~/shared/history/hooks", () => ({
  useHistory: () => ({
    addHistory,
    getTanbunTitle: vi.fn(() => "単文"),
  }),
}));
vi.mock("../components/TanbunCard", () => ({
  default: ({ k }: { k: { sentence: string } }) => (
    <div>関係する単文: {k.sentence}</div>
  ),
  TanbunCardContent: ({ k }: { k: { sentence: string } }) => (
    <div>現在の単文: {k.sentence}</div>
  ),
}));

describe("単文詳細", () => {
  it("現在の単文から一段ずつ関係をたどれる", () => {
    render(
      <MemoryRouter initialEntries={["/tanbun/sentence-1"]}>
        <MainView detail={fixtureDetail1} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "詳細" })).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "保存場所" }),
    ).toHaveTextContent("@GTOphilos# 神は数学者か？");
    expect(
      screen.queryByRole("heading", { name: "論理" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "参照" })).toBeVisible();
    const definitionPath = screen.getByRole("navigation", {
      name: "保存場所",
    });
    expect(definitionPath).toBeVisible();
    expect(
      within(definitionPath).getByRole("link", {
        name: "ものは自分に相応しい居場所に向う",
      }),
    ).toBeVisible();
    expect(definitionPath).toHaveTextContent(
      fixtureDetail1.location.headers[0].val,
    );
    expect(
      within(definitionPath).queryByText("アルキメデス", { exact: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "定義元の経路" }),
    ).not.toBeInTheDocument();
    expect(
      within(definitionPath).queryByText("定義元"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "子" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "前提" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "結論" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "参照している" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "参照されている" }),
    ).toBeVisible();
    expect(screen.queryByText("なし")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "クイズを見る" })).toBeVisible();
    expect(screen.getByRole("button", { name: "＋ クイズ" })).toBeVisible();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(addHistory).toHaveBeenCalledWith({
      title: "単文",
      url: `/tanbun/${fixtureDetail1.uid}`,
    });
  });

  it("引用用語を置いた場所ごとの親経路を表示する", () => {
    const detail = structuredClone(fixtureDetail1);
    detail.location.quote_contexts = [
      {
        user: detail.location.user,
        folders: detail.location.folders,
        resource: detail.location.resource,
        headers: detail.location.headers,
        parents: detail.location.parents.slice(0, 2),
      },
    ];

    render(
      <MemoryRouter initialEntries={["/tanbun/sentence-1"]}>
        <MainView detail={detail} />
      </MemoryRouter>,
    );

    expect(screen.getByText("引用先 1件")).toBeVisible();
    const quotePath = screen.getByRole("navigation", {
      name: "引用先 1の経路",
    });
    expect(quotePath).toBeVisible();
    expect(within(quotePath).getByText("# 神は数学者か？")).toBeVisible();
  });

  it("関係がない区画を表示しない", () => {
    const detail = structuredClone(fixtureDetail1);
    detail.g.edges = detail.g.edges.filter(
      ({ type }) => type !== "below" && type !== "resolved" && type !== "to",
    );

    render(
      <MemoryRouter initialEntries={["/tanbun/sentence-1"]}>
        <MainView detail={detail} />
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("heading", { name: "詳細" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "論理" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "参照" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("なし")).not.toBeInTheDocument();
  });
});
