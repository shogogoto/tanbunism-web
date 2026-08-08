import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import UnifiedSearch from ".";

const originalIntersectionObserver = globalThis.IntersectionObserver;

const user = {
  uid: "user-1",
  username: "reader",
  display_name: "読書家",
  profile: "数学を読んでいます",
  created: "2026-08-01T00:00:00Z",
};
const resource = {
  uid: "resource-1",
  name: "数学ノート",
  authors: ["著者"],
};
const resourceInfo = {
  user,
  resource,
  resource_stats: {
    n_char: 100,
    n_sentence: 1,
    n_term: 1,
    n_edge: 0,
    average_degree: 0,
    density: 0,
  },
};

let requestedTypes: string[] = [];
const server = setupServer(
  http.get("*/tanbun/", () => {
    requestedTypes.push("knowledge");
    return HttpResponse.json({
      total: 1,
      data: [
        {
          uid: "sentence-1",
          sentence: "数学の知識",
          term: { names: ["数学"] },
          stats: {
            score: 12,
            n_detail: 2,
            n_premise: 3,
            n_conclusion: 4,
            n_refer: 5,
            n_referred: 6,
          },
          resource_uid: resource.uid,
        },
      ],
      resource_infos: { [resource.uid]: resourceInfo },
    });
  }),
  http.post("*/resource/search", () => {
    requestedTypes.push("resource");
    return HttpResponse.json({ total: 1, data: [resourceInfo] });
  }),
  http.post("*/user/search", () => {
    requestedTypes.push("user");
    return HttpResponse.json({
      total: 1,
      data: [
        {
          user,
          archivement: {
            n_char: 100,
            n_sentence: 1,
            n_resource: 1,
            created: "2026-08-01T00:00:00Z",
          },
        },
      ],
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  requestedTypes = [];
  server.resetHandlers();
  if (originalIntersectionObserver) {
    globalThis.IntersectionObserver = originalIntersectionObserver;
  } else {
    Reflect.deleteProperty(globalThis, "IntersectionObserver");
  }
});
afterAll(() => server.close());

function renderSearch(initialEntry = "/search?q=数学") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <UnifiedSearch />
    </MemoryRouter>,
  );
}

describe("統合検索", () => {
  it("知識・リソース・ユーザーを混ぜ、知識は重要度だけを表示する", async () => {
    renderSearch();

    expect(await screen.findByText("3件の検索結果")).toBeVisible();
    expect(screen.getByRole("link", { name: /数学の知識/ })).toBeVisible();
    expect(screen.getByText("数学ノート")).toBeVisible();
    expect(screen.getAllByText("読書家")).toHaveLength(2);
    expect(screen.getByText("重要度 12")).toBeVisible();
    expect(screen.queryByText("詳細数")).not.toBeInTheDocument();
    expect(requestedTypes.sort()).toEqual(["knowledge", "resource", "user"]);
  });

  it("検索対象を同じ画面で絞り込む", async () => {
    const ui = userEvent.setup();
    renderSearch("/search?q=数学&types=knowledge,resource");

    await screen.findByText("2件の検索結果");
    requestedTypes = [];
    await ui.click(screen.getByRole("button", { name: "リソース" }));

    await waitFor(() => expect(requestedTypes).toEqual(["knowledge"]));
    expect(screen.getByRole("button", { name: "リソース" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("1件の検索結果")).toBeVisible();
  });

  it("末尾が見えたら次の検索結果を自動で追加する", async () => {
    class ImmediateIntersectionObserver {
      constructor(private callback: IntersectionObserverCallback) {}

      observe() {
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }

      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [0];
    }
    globalThis.IntersectionObserver =
      ImmediateIntersectionObserver as unknown as typeof IntersectionObserver;
    server.use(
      http.get("*/tanbun/", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        return HttpResponse.json({
          total: 2,
          data: [
            {
              uid: `sentence-${page}`,
              sentence: `知識 ${page}`,
              stats: {
                score: page,
                n_detail: 0,
                n_premise: 0,
                n_conclusion: 0,
                n_refer: 0,
                n_referred: 0,
              },
              resource_uid: resource.uid,
            },
          ],
          resource_infos: { [resource.uid]: resourceInfo },
        });
      }),
    );

    renderSearch("/search?types=knowledge");

    expect(await screen.findByText("知識 1")).toBeVisible();
    expect(await screen.findByText("知識 2")).toBeVisible();
    expect(screen.getByText("すべて表示しました")).toBeVisible();
  });
});
