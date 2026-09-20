import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import MainView from "./MainView";
import { fixtureDetail1 } from "./fixture";

vi.mock("~/shared/history/hooks", () => ({
  useHistory: () => ({
    addHistory: vi.fn(),
    getTanbunTitle: vi.fn(() => "単文"),
  }),
}));
vi.mock("../components/LocationView", () => ({ default: () => null }));
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
    expect(screen.getByRole("heading", { name: "論理" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "参照" })).toBeVisible();
    const definitionPath = screen.getByRole("navigation", {
      name: "定義元の経路",
    });
    expect(definitionPath).toBeVisible();
    expect(within(definitionPath).getAllByRole("link")[0]).toHaveTextContent(
      "アリストテレスの運動法則",
    );
    expect(screen.getByRole("button", { name: "子" })).toBeVisible();
    expect(screen.getByRole("button", { name: "前提" })).toBeVisible();
    expect(screen.getByRole("button", { name: "結論" })).toBeVisible();
    expect(screen.getByRole("button", { name: "参照している" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "参照されている" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "クイズを見る" })).toBeVisible();
    expect(screen.getByRole("button", { name: "＋ クイズ" })).toBeVisible();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
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
});
