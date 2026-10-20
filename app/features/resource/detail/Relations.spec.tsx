import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Backbone from "./Backbone";
import { ResourceDetailProvider } from "./Context";
import { TraceMemoryProvider } from "./TraceMemory/Context";
import { resourceOppositionFixture } from "./opposition.fixture";
import { toAdjacent } from "./util";

vi.mock("./SentenceQuizActions", () => ({ default: () => null }));

it.each([false, true])(
  "反対関係を向きに依存せず本文と配下に描画する: reverse=%s",
  async (reverse) => {
    const state = resourceOppositionFixture(reverse);
    render(
      <MemoryRouter>
        <ResourceDetailProvider {...state}>
          <TraceMemoryProvider>
            <Backbone startId={state.rootId} />
          </TraceMemoryProvider>
        </ResourceDetailProvider>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("link", { name: "未来を暗く見る" }),
    ).toHaveAttribute("href", "/tanbun/pessimism");
    expect(screen.getByLabelText("反対関係")).toHaveTextContent("↔");
    expect(
      screen.getByRole("link", { name: "最悪の場合を想定して備える" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "未来を明るく見る" }),
    ).toHaveLength(1);
  },
);

it("逆向きの重複・自己参照を除き、反対の反対へは展開しない", () => {
  const { graph, uids, terms } = resourceOppositionFixture();
  graph.addDirectedEdge("pessimism", "optimism", { type: "anti" });
  graph.addDirectedEdge("optimism", "optimism", { type: "anti" });
  graph.addDirectedEdge("pessimism", "detail", { type: "anti" });
  const adj = toAdjacent("optimism", graph, uids, terms);
  expect(adj.opposites().map(({ kn }) => kn.uid)).toEqual(["pessimism"]);
});
