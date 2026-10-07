import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { SWRConfig } from "swr";
import { vi } from "vitest";
import PowerSettingsManager from ".";

const deletePrefix = vi.fn().mockResolvedValue(1);
vi.mock("~/shared/lib/indexed", () => ({
  genericCache: { deletePrefix: (...args: unknown[]) => deletePrefix(...args) },
}));
const weights = {
  sentence: 1,
  term: 1,
  logic: 3,
  reference: 2,
  abstraction: 2,
};
const saved = vi.fn();
const server = setupServer(
  http.get("*/admin/settings/resource-power", () => HttpResponse.json(weights)),
  http.put("*/admin/settings/resource-power", async ({ request }) => {
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
  cache.set("resource-growth", { _k: "resource-growth", data: { power: 8 } });
  render(
    <SWRConfig value={{ provider: () => cache }}>
      <PowerSettingsManager />
    </SWRConfig>,
  );
  return cache;
}

it("5項目の重みを保存し、既存Powerのキャッシュを更新する。0も指定可能", async () => {
  const user = userEvent.setup();
  const cache = renderSettings();
  const sentence = await screen.findByLabelText("単文の重み");
  expect(sentence).toHaveValue(1);
  await user.clear(sentence);
  await user.type(sentence, "0");
  const logic = screen.getByLabelText("論理関係の重み");
  await user.clear(logic);
  await user.type(logic, "5");
  const abstraction = screen.getByLabelText("具体・抽象関係の重み");
  await user.clear(abstraction);
  await user.type(abstraction, "3");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() =>
    expect(saved).toHaveBeenCalledWith({
      ...weights,
      sentence: 0,
      logic: 5,
      abstraction: 3,
    }),
  );
  expect(deletePrefix).toHaveBeenCalledWith("public:profile-detail:");
  await waitFor(() =>
    expect(cache.get("resource-growth").data).toBeUndefined(),
  );
});

it("保存失敗を表示し、表示済みPowerは維持する", async () => {
  server.use(
    http.put(
      "*/admin/settings/resource-power",
      () => new HttpResponse(null, { status: 403 }),
    ),
  );
  const cache = renderSettings();
  await screen.findByLabelText("単文の重み");
  await userEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("失敗");
  expect(deletePrefix).not.toHaveBeenCalled();
  expect(cache.get("resource-growth").data).toEqual({ power: 8 });
});
