import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { EntryDetail } from "~/shared/generated/fastAPI.schemas";
import { EntryDetailView } from ".";

const resourceId = "30000000-0000-0000-0000-000000000000";

const detail: EntryDetail = {
  user: {
    uid: "user-1",
    username: "GTO",
    display_name: "やっぱつれぇわ",
    created: "2026-09-26T00:00:00Z",
  },
  ancestors: [{ uid: "entry-1", name: "humanities" }],
  entry: { uid: "entry-2", name: "philosophy" },
  children: [
    { uid: "entry-3", name: "ancient" },
    {
      uid: resourceId,
      name: "国家",
      authors: ["プラトン"],
      published: "-375",
    },
  ],
  stats: {
    [resourceId.replaceAll("-", "")]: {
      average_degree: 2,
      n_char: 1000,
      n_sentence: 120,
      n_term: 35,
      n_edge: 210,
      n_isolation: 1,
      n_axiom: 2,
      n_unrefered: 3,
      r_isolation: 0.1,
      r_axiom: 0.2,
      r_unrefered: 0.3,
    },
  },
};

describe("EntryDetailView", () => {
  it("直下のEntryとResourceを軽量な一覧として表示する", () => {
    render(
      <MemoryRouter>
        <EntryDetailView detail={detail} />
      </MemoryRouter>,
    );

    expect(screen.getByText("1 Entries · 1 Resources")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "humanities" })).toHaveAttribute(
      "href",
      "/entry/entry-1",
    );
    const breadcrumb = screen.getByRole("navigation", { name: "保存場所" });
    expect(within(breadcrumb).getByText("philosophy")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /ancient/ })).toHaveAttribute(
      "href",
      "/entry/entry-3",
    );
    expect(
      screen.getByRole("link", { name: /国家.*プラトン/ }),
    ).toHaveAttribute("href", `/resource/${resourceId}`);
    expect(screen.getByTitle("単文数")).toHaveTextContent("120");
    expect(screen.getByTitle("用語数")).toHaveTextContent("35");
    expect(screen.getByTitle("関係数")).toHaveTextContent("210");
    expect(
      screen.getByRole("link", { name: "国家のクイズ一覧" }),
    ).toHaveAttribute("href", `/quiz/list?resource=${resourceId}`);
  });
});
