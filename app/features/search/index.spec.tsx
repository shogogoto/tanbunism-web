import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { MemoryRouter, useLocation } from "react-router";
import GlobalHotkeys, {
  HotkeyProvider,
} from "~/features/hotkeys/GlobalHotkeys";
import type {
  ResourceSearchBody,
  UserSearchBody,
} from "~/shared/generated/fastAPI.schemas";
import { HistoryPanelProvider } from "~/shared/history/HistoryPanel";
import { createCacheKey } from "~/shared/hooks/swr/useCache";
import { genericCache } from "~/shared/lib/indexed";
import UnifiedSearch from ".";
import SearchHeaderControls from "./SearchHeaderControls";
import { defaultSearchSettings } from "./settings";

const originalIntersectionObserver = globalThis.IntersectionObserver;
vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));
vi.mock("~/shared/history/hooks", () => ({
  useHistory: () => ({ histories: [] }),
}));

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
      pagerank_scores: { "sentence-1": 2.345 },
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

function CurrentLocation() {
  return <output aria-label="現在地">{useLocation().pathname}</output>;
}

function renderSearch(initialEntry = "/search?q=数学") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <HistoryPanelProvider>
        <HotkeyProvider>
          <SearchHeaderControls />
          <UnifiedSearch />
          <GlobalHotkeys />
          <CurrentLocation />
        </HotkeyProvider>
      </HistoryPanelProvider>
    </MemoryRouter>,
  );
}

describe("統合検索", () => {
  it("左右スワイプでタブを切り替え検索文字列を保持する", async () => {
    renderSearch();
    const swipeLeft = (element: HTMLElement) => {
      fireEvent.touchStart(element, {
        touches: [{ clientX: 220, clientY: 200 }],
      });
      fireEvent.touchMove(element, {
        touches: [{ clientX: 50, clientY: 200 }],
      });
      fireEvent.touchEnd(element, {
        changedTouches: [{ clientX: 50, clientY: 200 }],
      });
    };
    const knowledge = await screen.findByRole("link", { name: /数学の知識/ });
    swipeLeft(knowledge);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "リソース" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    expect(screen.getByRole("searchbox", { name: "検索" })).toHaveValue("数学");
    const resource = await screen.findByRole("link", { name: /数学ノート/ });
    swipeLeft(resource);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "ユーザー" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    expect(screen.getByRole("searchbox", { name: "検索" })).toHaveValue("数学");
  });
  it("検索設定内をキーで移動し、変更後にEscで閉じる", async () => {
    const ui = userEvent.setup();
    renderSearch();
    await screen.findByText("1件の検索結果");
    await ui.keyboard("s");
    const query = screen.getByPlaceholderText("リソース名で探す");
    expect(query).toHaveFocus();
    await ui.keyboard("jk");
    expect(query).toHaveValue("jk");
    await ui.keyboard("{Tab}");
    expect(screen.getByLabelText("知識の対象リソース")).toHaveFocus();
    await ui.keyboard("{Control>}j{/Control}");
    expect(screen.getByLabelText("知識の並び順")).toHaveFocus();
    await ui.keyboard("{Control>}j{/Control}{Tab}");
    const descending = screen.getByLabelText("重要度の高い順");
    expect(descending).toHaveFocus();
    expect(descending).toBeChecked();
    await ui.keyboard(" ");
    expect(descending).not.toBeChecked();
    await waitFor(() =>
      expect(
        knowledgeRequests.some(
          (request) => request.searchParams.get("desc") === "false",
        ),
      ).toBe(true),
    );
    await ui.keyboard("{Control>}k{/Control}");
    expect(screen.getByLabelText("一致方法")).toHaveFocus();
    await ui.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "検索設定" })).toBeNull();
    expect(screen.getByRole("button", { name: "詳細設定" })).toHaveFocus();
    expect(document.querySelector("[data-hotkey-active=true]")).toBeNull();
  });

  it("検索設定のTab移動はパネル内で循環し、閉じた項目を飛ばす", async () => {
    const ui = userEvent.setup();
    renderSearch();
    await screen.findByText("1件の検索結果");
    await ui.keyboard("s");
    await ui.keyboard("{Shift>}{Tab}{/Shift}");
    const section = screen.getByRole("button", { name: "知識の検索条件" });
    expect(section).toHaveFocus();
    await ui.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "初期値に戻す" })).toHaveFocus();
    await ui.keyboard("{Tab}");
    expect(section).toHaveFocus();
    await ui.keyboard("{Enter}");
    await ui.keyboard("{Control>}j{/Control}");
    expect(screen.getByRole("button", { name: "初期値に戻す" })).toHaveFocus();
    await ui.keyboard("{Escape}");
    expect(screen.queryByLabelText("知識の並び順")).not.toBeInTheDocument();
  });

  it("知識カード全体を選択し、Enterで単文詳細へ移動する", async () => {
    const ui = userEvent.setup();
    renderSearch();
    const link = await screen.findByRole("link", { name: /数学の知識/ });
    const card = link.closest("[data-hotkey-item]");
    expect(card).not.toHaveAttribute("data-hotkey-active");
    await ui.keyboard("j");
    expect(card).toHaveAttribute("data-hotkey-active", "true");
    expect(card?.contains(screen.getByLabelText("PageRank: 2.35"))).toBe(true);
    await ui.keyboard("{Enter}");
    expect(screen.getByLabelText("現在地")).toHaveTextContent(
      "/tanbun/sentence-1",
    );
  });
  it("sで検索設定を開き、入力中のsやg sとは競合しない", async () => {
    const ui = userEvent.setup();
    renderSearch();
    await screen.findByText("1件の検索結果");
    await ui.keyboard("s");
    expect(await screen.findByLabelText("知識の並び順")).toBeVisible();
    await ui.keyboard("{Escape}");
    const input = screen.getByRole("searchbox", { name: "検索" });
    await ui.click(input);
    await ui.type(input, "s");
    expect(input).toHaveValue("数学s");
    expect(screen.queryByLabelText("知識の並び順")).not.toBeInTheDocument();
    await ui.keyboard("{Escape}");
    await ui.keyboard("gs");
    expect(screen.queryByLabelText("知識の並び順")).not.toBeInTheDocument();
  });
  it("全リソースでもPageRank順を使え、スコア順でも両方の値を表示する", async () => {
    const ui = userEvent.setup();
    renderSearch();
    await screen.findByText("1件の検索結果");
    expect(screen.getByLabelText("PageRank: 2.35")).toBeVisible();
    await ui.click(screen.getByRole("button", { name: "詳細設定" }));
    expect(
      screen.getByRole("option", { name: "PageRank順" }),
    ).not.toBeDisabled();
    await ui.selectOptions(screen.getByLabelText("知識の並び順"), "pagerank");
    expect(await screen.findByLabelText("PageRank: 2.35")).toBeVisible();
    expect(
      knowledgeRequests.some(
        (request) =>
          request.searchParams.get("sort") === "pagerank" &&
          !request.searchParams.has("resource_id"),
      ),
    ).toBe(true);
    await screen.findByRole("option", { name: "数学ノート（@reader）" });
    await ui.selectOptions(
      screen.getByLabelText("知識の対象リソース"),
      resource.uid,
    );
    expect(
      screen.getByRole("option", { name: "PageRank順" }),
    ).not.toBeDisabled();
    await ui.selectOptions(screen.getByLabelText("知識の並び順"), "pagerank");
    expect(await screen.findByLabelText("PageRank: 2.35")).toBeVisible();
    expect(screen.getByLabelText("スコア: 12")).toBeVisible();
    expect(
      knowledgeRequests.some(
        (request) =>
          request.searchParams.get("sort") === "pagerank" &&
          request.searchParams.get("resource_id") === resource.uid,
      ),
    ).toBe(true);
    await ui.selectOptions(screen.getByLabelText("知識の対象リソース"), "");
    expect(screen.getByLabelText("知識の並び順")).toHaveValue("pagerank");
    expect(screen.getByLabelText("PageRank: 2.35")).toBeVisible();
    await ui.selectOptions(screen.getByLabelText("知識の並び順"), "score");
    expect(screen.getByLabelText("PageRank: 2.35")).toBeVisible();
    expect(screen.getByLabelText("知識の並び順")).toHaveValue("score");
  });

  it("PageRank未計算・古い結果は0ではなくダッシュで表示する", async () => {
    server.use(
      http.get("*/tanbun/", () =>
        HttpResponse.json({
          total: 1,
          data: [
            {
              uid: "sentence-1",
              sentence: "未計算の知識",
              stats: { score: 12 },
              resource_uid: resource.uid,
            },
          ],
          resource_infos: { [resource.uid]: resourceInfo },
          pagerank_scores: { "sentence-1": null },
        }),
      ),
    );
    renderSearch(
      "/search?knowledge_order=pagerank&knowledge_resource=resource-1",
    );
    const rank = await screen.findByLabelText("PageRank: 未計算・要再計算");
    expect(rank).toHaveTextContent("—");
  });

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
    const knowledgeLink = screen.getByRole("link", { name: /数学の知識/ });
    const knowledgeCard = knowledgeLink.closest("[data-hotkey-item]");
    expect(knowledgeCard).not.toHaveAttribute("data-hotkey-active");
    expect(knowledgeCard).not.toHaveFocus();
    await ui.keyboard("j");
    await waitFor(() => {
      expect(knowledgeCard).toHaveAttribute("data-hotkey-active", "true");
      expect(knowledgeCard).toHaveFocus();
    });
    expect(knowledgeLink).not.toHaveAttribute("data-hotkey-item");
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
    const resourceLink = screen.getByRole("link", { name: /数学ノート/ });
    expect(resourceLink).not.toHaveAttribute("data-hotkey-active");
    await ui.keyboard("j");
    await waitFor(() =>
      expect(resourceLink).toHaveAttribute("data-hotkey-active", "true"),
    );
    expect(resourceLink).toHaveFocus();
    expect(resourceLink).toHaveClass(
      "data-[hotkey-active=true]:ring-2",
      "data-[hotkey-active=true]:ring-primary",
    );
    expect(screen.getByRole("tab", { name: "知識" })).not.toHaveClass("ring-1");

    await ui.click(screen.getByRole("tab", { name: "ユーザー" }));
    expect(await screen.findByText("Lv. 7")).toBeVisible();
    const userLink = screen.getByRole("link", { name: /読書家/ });
    expect(userLink).not.toHaveAttribute("data-hotkey-active");
    await ui.keyboard("k");
    await waitFor(() =>
      expect(userLink).toHaveAttribute("data-hotkey-active", "true"),
    );
    expect(userLink).toHaveFocus();
    expect(userLink).toHaveClass(
      "data-[hotkey-active=true]:ring-2",
      "data-[hotkey-active=true]:ring-primary",
    );
    expect(requestedTypes).toEqual(["knowledge", "resource", "user"]);

    await ui.click(screen.getByRole("tab", { name: "知識" }));
    const returnedKnowledge = await screen.findByRole("link", {
      name: /数学の知識/,
    });
    await waitFor(() => {
      expect(
        returnedKnowledge.closest("[data-hotkey-item]"),
      ).not.toHaveAttribute("data-hotkey-active");
    });
  });

  it("同件数のcacheが最新結果へ入れ替わってもcurrentを復元する", async () => {
    const cachedResource = {
      ...resourceInfo,
      resource: { ...resource, uid: "cached-resource", name: "古いノート" },
    };
    const cacheKey = createCacheKey("unified-search-resource", {
      query: "数学",
      settings: JSON.stringify(defaultSearchSettings.resource),
      page: 1,
    });
    await genericCache.set(cacheKey, {
      type: "resource",
      data: [cachedResource],
      total: 1,
    });
    let resolveFresh: ((response: Response) => void) | undefined;
    server.use(
      http.post(
        "*/resource/search",
        () =>
          new Promise((resolve) => {
            resolveFresh = resolve;
          }),
      ),
    );
    const ui = userEvent.setup();
    renderSearch();

    await ui.click(screen.getByRole("tab", { name: "リソース" }));
    const cachedLink = await screen.findByRole("link", { name: /古いノート/ });
    expect(cachedLink).not.toHaveAttribute("data-hotkey-active");
    await ui.keyboard("j");
    await waitFor(() => {
      expect(cachedLink).toHaveFocus();
      expect(cachedLink).toHaveAttribute("data-hotkey-active", "true");
    });

    await act(async () => {
      resolveFresh?.(HttpResponse.json({ total: 1, data: [resourceInfo] }));
    });
    const freshLink = await screen.findByRole("link", { name: /数学ノート/ });
    await waitFor(() => {
      expect(freshLink).toHaveFocus();
      expect(freshLink).toHaveAttribute("data-hotkey-active", "true");
    });
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
