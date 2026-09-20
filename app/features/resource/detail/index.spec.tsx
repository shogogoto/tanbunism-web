import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { toGraph } from "~/shared/lib/network";
import { ResourceDetailProvider } from "./Context";
import DefPresenter from "./Presenter/DefPresenter";
import { TraceMemoryProvider } from "./TraceMemory/Context";
import { resourceDetailFiture } from "./fixture";
import { toAdjacent } from "./util";

vi.mock("./Relations", () => ({ default: () => null }));
vi.mock("./SentenceQuizActions", () => ({ default: () => null }));

const { g, resource_info, uids, terms } = resourceDetailFiture;
const G = toGraph(g);

describe("ResourceDetail", () => {
  it("関係の周辺", () => {
    const id = "e4254a62-74cd-46d2-9d75-2e69a717c2ec";
    const adj = toAdjacent(id, G, uids, terms);
    expect(adj.kn.term?.names?.[0]).toBe("デイヴィッド・チャーマーズ");
    expect(adj.kn.sentence).toBe("28歳でクオリアが原理的に解明されない");
    expect(adj.premises()).toHaveLength(0);
    expect(adj.siblings()).toHaveLength(0); // 他の関係は省略
  });

  it("downArrays", () => {
    const rootId = resource_info.resource.uid;
    const adj = toAdjacent(rootId, G, uids, terms);
    const arrs = adj.downArrays();
    expect(arrs[0]).toHaveLength(1); // 兄弟なし
    expect(arrs[1]).toHaveLength(3); // 3兄弟
  });

  it("単文の用語名と本文から詳細を直接開ける", () => {
    const id = "e4254a62-74cd-46d2-9d75-2e69a717c2ec";
    const adj = toAdjacent(id, G, uids, terms);

    render(
      <MemoryRouter>
        <ResourceDetailProvider
          graph={G}
          terms={terms}
          uids={uids}
          rootId={resource_info.resource.uid}
          resource_info={resource_info}
        >
          <TraceMemoryProvider>
            <DefPresenter adj={adj} />
          </TraceMemoryProvider>
        </ResourceDetailProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "デイヴィッド・チャーマーズ" }),
    ).toHaveAttribute("href", `/tanbun/${id}`);
    expect(
      screen.getByRole("link", {
        name: "28歳でクオリアが原理的に解明されない",
      }),
    ).toHaveAttribute("href", `/tanbun/${id}`);
  });

  it("aliasと展開先を一行のインライン要素として表示する", () => {
    const graph = toGraph({
      directed: true,
      multigraph: true,
      graph: {},
      nodes: [{ id: "alias" }, { id: "definition" }],
      edges: [
        {
          key: 0,
          source: "alias",
          target: "definition",
          type: "quoterm",
        },
      ],
    });
    const adj = toAdjacent(
      "alias",
      graph,
      {
        alias: "BL",
        definition: "黒点が太陽の表面にある",
      },
      {},
    );

    render(
      <MemoryRouter>
        <ResourceDetailProvider
          graph={graph}
          terms={{}}
          uids={{
            alias: "BL",
            definition: "黒点が太陽の表面にある",
          }}
          rootId={resource_info.resource.uid}
          resource_info={resource_info}
        >
          <TraceMemoryProvider>
            <DefPresenter adj={adj} />
          </TraceMemoryProvider>
        </ResourceDetailProvider>
      </MemoryRouter>,
    );

    const inline = screen.getByTestId("quoterm-inline");
    expect(inline).toHaveClass("inline");
    expect(inline).toHaveTextContent("BL | 黒点が太陽の表面にある");
    expect(inline.querySelector("div")).not.toBeInTheDocument();
  });
});
