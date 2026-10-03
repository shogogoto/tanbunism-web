import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter } from "react-router";
import type {
  ResourceSearchBody,
  UserSearchBody,
} from "~/shared/generated/fastAPI.schemas";
import { genericCache } from "~/shared/lib/indexed";
import UnifiedSearch from ".";
import SearchHeaderControls from "./SearchHeaderControls";

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
let knowledgeRequests: URL[] = [];
let resourceRequests: ResourceSearchBody[] = [];
let userRequests: UserSearchBody[] = [];
const server = setupServer(
  http.get("*/tanbun/", ({ request }) => {
    requestedTypes.push("knowledge");
    knowledgeRequests.push(new URL(request.url));
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
  http.post("*/resource/search", async ({ request }) => {
    requestedTypes.push("resource");
    resourceRequests.push((await request.json()) as ResourceSearchBody);
    return HttpResponse.json({ total: 1, data: [resourceInfo] });
  }),
  http.post("*/user/search", async ({ request }) => {
    requestedTypes.push("user");
    userRequests.push((await request.json()) as UserSearchBody);
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
          level: 7,
        },
      ],
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(async () => {
  requestedTypes = [];
  knowledgeRequests = [];
  resourceRequests = [];
  userRequests = [];
  server.resetHandlers();
  if (originalIntersectionObserver) {
    globalThis.IntersectionObserver = originalIntersectionObserver;
  } else {
    Reflect.deleteProperty(globalThis, "IntersectionObserver");
  }
  await genericCache.clear();
});
afterAll(() => server.close());

function renderSearch(initialEntry = "/search?q=数学") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SearchHeaderControls />
      <UnifiedSearch />
    </MemoryRouter>,
  );
}

describe("統合検索", () => {
  it("知識・リソース・ユーザーをタブで切り替える", async () => {
    const ui = userEvent.setup();
    renderSearch();

    expect(await screen.findByText("1件の検索結果")).toBeVisible();
    expect(screen.getByRole("link", { name: /数学の知識/ })).toBeVisible();
    expect(screen.getByLabelText("スコア: 12")).toBeVisible();
    expect(screen.getByRole("tab", { name: "知識" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "知識" })).toHaveTextContent("1");
    expect(screen.getByRole("tab", { name: "知識" })).toHaveClass("ring-1");
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /数学の知識/ })).toHaveAttribute(
        "data-hotkey-active",
        "true",
      ),
    );
    await ui.click(screen.getByRole("tab", { name: "リソース" }));
    await waitFor(() => expect(requestedTypes).toContain("resource"));
    await waitFor(() => expect(document.body).toHaveTextContent("数学ノート"));
    expect(screen.queryByRole("link", { name: /数学の知識/ })).toBeNull();
    expect(screen.getByRole("tab", { name: "リソース" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "リソース" })).toHaveTextContent(
      "2",
    );
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /数学ノート/ })).toHaveAttribute(
        "data-hotkey-active",
        "true",
      ),
    );
    expect(screen.getByRole("tab", { name: "知識" })).not.toHaveClass("ring-1");

    await ui.click(screen.getByRole("tab", { name: "ユーザー" }));
    expect(await screen.findByText("Lv. 7")).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /読書家/ })).toHaveAttribute(
        "data-hotkey-active",
        "true",
      ),
    );
    expect(requestedTypes).toEqual(["knowledge", "resource", "user"]);
  });

  it("対象ごとの詳細条件を検索APIへ反映する", async () => {
    const ui = userEvent.setup();
    renderSearch();
    await screen.findByText("1件の検索結果");

    await ui.click(screen.getByRole("button", { name: "詳細設定" }));
    await ui.selectOptions(screen.getByLabelText("一致方法"), "EQUAL");
    await ui.selectOptions(screen.getByLabelText("詳細"), "3");
    await ui.keyboard("{Escape}");

    await ui.click(screen.getByRole("tab", { name: "リソース" }));
    await ui.click(screen.getByRole("button", { name: "詳細設定" }));
    await ui.type(screen.getByLabelText("所有ユーザー"), "reader");
    await ui.selectOptions(
      screen.getByLabelText("リソースの並び順"),
      "updated",
    );
    await ui.keyboard("{Escape}");

    await ui.click(screen.getByRole("tab", { name: "ユーザー" }));
    await ui.click(screen.getByRole("button", { name: "詳細設定" }));
    await ui.selectOptions(
      screen.getByLabelText("ユーザーの並び順"),
      "n_resource",
    );
    await ui.click(screen.getByLabelText("ユーザーを降順に並べる"));

    await waitFor(() => {
      expect(
        knowledgeRequests.some(
          (request) =>
            request.searchParams.get("type") === "EQUAL" &&
            request.searchParams.get("n_detail") === "3",
        ),
      ).toBe(true);
      expect(resourceRequests).toContainEqual(
        expect.objectContaining({
          q_user: "reader",
          order_by: ["updated"],
        }),
      );
      expect(userRequests).toContainEqual(
        expect.objectContaining({
          desc: false,
          order_by: ["n_resource"],
        }),
      );
    });
  });

  it("検索対象ごとに詳細条件を開閉する", async () => {
    const ui = userEvent.setup();
    renderSearch("/search?q=数学&type=resource");
    await screen.findByText("1件の検索結果");

    await ui.click(screen.getByRole("button", { name: "詳細設定" }));
    const details = document.querySelector("[data-slot=popover-content]");
    expect(details).toHaveClass(
      "overflow-y-auto",
      "overscroll-contain",
      "touch-pan-y",
    );
    const resources = screen.getByRole("button", {
      name: "リソースの検索条件",
    });
    expect(resources).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("所有ユーザー")).toBeVisible();
    expect(screen.queryByLabelText("一致方法")).toBeNull();
    expect(screen.queryByLabelText("ユーザーの並び順")).toBeNull();

    await ui.click(resources);
    expect(resources).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("所有ユーザー")).toBeNull();
  });

  it("入力中にdebounce済みURLの古い値へ巻き戻さない", async () => {
    const ui = userEvent.setup({ delay: 100 });
    renderSearch();
    const input = screen.getByRole("searchbox", { name: "検索" });

    await ui.clear(input);
    await ui.type(input, "グラフ検索");

    expect(input).toHaveValue("グラフ検索");
    await waitFor(() =>
      expect(
        knowledgeRequests.some(
          (request) => request.searchParams.get("q") === "グラフ検索",
        ),
      ).toBe(true),
    );
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
