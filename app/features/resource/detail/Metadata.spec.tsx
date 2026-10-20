import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Backbone from "./Backbone";
import { ResourceDetailProvider } from "./Context";
import ResourceMeta from "./ResourceMeta";
import { TraceMemoryProvider } from "./TraceMemory/Context";
import { resourceMetadataFixture } from "./metadata.fixture";
import { resourceMetadataSentenceIds } from "./util";

vi.mock("./SentenceQuizActions", () => ({ default: () => null }));

it("旧importのメタ情報は本文から隠し、ヘッダーと通常の本文を残す", async () => {
  const state = resourceMetadataFixture();
  render(
    <MemoryRouter>
      <ResourceDetailProvider {...state}>
        <TraceMemoryProvider>
          <ResourceMeta info={state.resource_info} />
          <Backbone startId={state.rootId} />
        </TraceMemoryProvider>
      </ResourceDetailProvider>
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("link", { name: "通常の本文です" }),
  ).toBeVisible();
  for (const id of ["author", "published", "url", "explicitAuthor"] as const) {
    expect(
      screen.queryByText(state.uids[id], { exact: true }),
    ).not.toBeInTheDocument();
  }
  expect(screen.getByText("岡本浩一", { exact: true })).toBeVisible();
  expect(screen.getByText("2002/5/29", { exact: true })).toBeVisible();
  expect(
    screen.getByRole("link", { name: "contact@example.com" }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "@これは本文中のメンション" }),
  ).toBeVisible();
});

it("先頭の宣言だけを検出し、本文が始まった後の@記述は除外しない", () => {
  const { rootId, graph, uids, terms } = resourceMetadataFixture();
  expect([...resourceMetadataSentenceIds(rootId, graph, uids, terms)]).toEqual([
    "author",
    "published",
    "url",
    "explicitAuthor",
  ]);
  expect(resourceMetadataSentenceIds("missing", graph, uids, terms).size).toBe(
    0,
  );
});
