import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SWRConfig } from "swr";
import { vi } from "vitest";
import PageRankManager from ".";

const submitted = vi.fn();
const saved = vi.fn();
const settings = {
  max_concurrent_jobs: 1,
  max_pending_jobs: 10,
  max_nodes: 20000,
  max_edges: 100000,
};
const job = {
  uid: "job",
  status: "running",
  total: 2,
  completed: 1,
  current_title: "論理学",
  results: [{ resource_id: "r1", title: "失敗した本", error: "サイズ上限" }],
};
const server = setupServer(
  http.get("*/admin/pagerank/resources", () =>
    HttpResponse.json([
      { uid: "r1", title: "論理学", state: "missing", computed_at: null },
      { uid: "r2", title: "哲学", state: "ready", computed_at: "2026-10-07" },
      { uid: "r3", title: "科学", state: "stale", computed_at: "2026-10-06" },
    ]),
  ),
  http.get("*/admin/pagerank/jobs", () => HttpResponse.json([job])),
  http.get("*/admin/pagerank/settings", () => HttpResponse.json(settings)),
  http.post("*/admin/pagerank/jobs", async ({ request }) => {
    submitted(await request.json());
    return HttpResponse.json({ ...job, status: "queued" }, { status: 202 });
  }),
  http.put("*/admin/pagerank/settings", async ({ request }) => {
    const body = await request.json();
    saved(body);
    return HttpResponse.json(body);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

function setup() {
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <PageRankManager />
    </SWRConfig>,
  );
}

it("未計算・更新分だけ選択して一括受付し、進捗と対象名を表示", async () => {
  setup();
  await screen.findByText("哲学");
  expect(
    screen.getByRole("button", { name: "選択した0件を計算" }),
  ).toBeDisabled();
  await userEvent.click(
    screen.getByRole("button", { name: "未計算・更新分を選択" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "選択した2件を計算" }),
  );
  await waitFor(() =>
    expect(submitted).toHaveBeenCalledWith({ resource_ids: ["r1", "r3"] }),
  );
  expect(screen.getByText("計算中: 論理学")).toBeInTheDocument();
  expect(screen.getByText("1 / 2件")).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "1");
});

it("失敗対象を再計算対象に追加し、絞込みで他の選択は失わない", async () => {
  setup();
  await userEvent.click(await screen.findByText("結果（失敗 1件）"));
  await userEvent.click(
    screen.getByRole("button", { name: "再計算対象に追加" }),
  );
  await userEvent.type(
    screen.getByRole("textbox", { name: "リソースを絞り込む" }),
    "哲学",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "選択した1件を計算" }),
  );
  await waitFor(() =>
    expect(submitted).toHaveBeenCalledWith({ resource_ids: ["r1"] }),
  );
});

it("専用キューの上限を保存", async () => {
  setup();
  await userEvent.click(screen.getByText("専用キューの負荷制御"));
  const input = await screen.findByLabelText("同時実行ジョブ数");
  await userEvent.clear(input);
  await userEvent.type(input, "2");
  await userEvent.click(screen.getByRole("button", { name: "設定を保存" }));
  await waitFor(() =>
    expect(saved).toHaveBeenCalledWith({ ...settings, max_concurrent_jobs: 2 }),
  );
});

it("キュー受付失敗を表示し、選択を維持", async () => {
  server.use(
    http.post("*/admin/pagerank/jobs", () =>
      HttpResponse.json({ detail: "キューが満杯です。" }, { status: 409 }),
    ),
  );
  setup();
  await screen.findByText("哲学");
  await userEvent.click(
    screen.getByRole("button", { name: "表示中をすべて選択" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "選択した3件を計算" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("キューが満杯");
  expect(
    screen.getByRole("button", { name: "選択した3件を計算" }),
  ).not.toBeDisabled();
});
