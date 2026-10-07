import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SWRConfig } from "swr";
import { vi } from "vitest";
import LevelSettingsManager from ".";

const deletePrefix = vi.fn().mockResolvedValue(1);
vi.mock("~/shared/lib/indexed", () => ({
  genericCache: { deletePrefix: (...args: unknown[]) => deletePrefix(...args) },
}));
const saved = vi.fn();
const server = setupServer(
  http.get("*/admin/settings/gamification", () =>
    HttpResponse.json({ level_xp_coefficient: 10 }),
  ),
  http.put("*/admin/settings/gamification", async ({ request }) => {
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

function renderSettings() {
  const cache = new Map();
  cache.set("/user/user-1/learning-progress", {
    _k: "/user/user-1/learning-progress",
    data: { level: 3 },
  });
  render(
    <SWRConfig value={{ provider: () => cache }}>
      <LevelSettingsManager />
    </SWRConfig>,
  );
  return cache;
}

it("係数を保存し、古いLvのキャッシュを無効化する", async () => {
  const user = userEvent.setup();
  const cache = renderSettings();
  const input = await screen.findByLabelText("レベルXP係数");
  expect(input).toHaveValue(10);
  await user.clear(input);
  await user.type(input, "20");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByRole("button", { name: "保存" });
  expect(saved).toHaveBeenCalledWith({ level_xp_coefficient: 20 });
  expect(deletePrefix).toHaveBeenCalledWith("public:profile-detail:");
  await waitFor(() =>
    expect(cache.get("/user/user-1/learning-progress").data).toBeUndefined(),
  );
});

it("保存失敗を表示し、キャッシュは消さない", async () => {
  server.use(
    http.put(
      "*/admin/settings/gamification",
      () => new HttpResponse(null, { status: 403 }),
    ),
  );
  renderSettings();
  await screen.findByLabelText("レベルXP係数");
  await userEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("失敗");
  expect(deletePrefix).not.toHaveBeenCalled();
});
