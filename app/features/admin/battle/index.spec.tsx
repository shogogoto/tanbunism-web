import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import BattleSettingsManager from ".";
const defaults = {
  base_seconds: 30,
  sent2term: 1,
  term2sent: 1.2,
  pair2rel: 1.5,
  rel2pair: 1.5,
};
const saved = vi.fn();
const server = setupServer(
  http.get("*/admin/settings/battle", () => HttpResponse.json(defaults)),
  http.put("*/admin/settings/battle", async ({ request }) => {
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
it("previews and saves basic seconds and per-type weights", async () => {
  render(<BattleSettingsManager />);
  const user = userEvent.setup();
  const base = await screen.findByLabelText("基本秒数");
  expect(base).toHaveValue(30);
  const weight = screen.getByLabelText("単文組 → 関係の重み");
  await user.clear(weight);
  await user.type(weight, "2");
  expect(screen.getByText("60秒")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByText("戦闘設定を保存しました")).toBeInTheDocument();
  expect(saved).toHaveBeenCalledWith({ ...defaults, pair2rel: 2 });
});
it("reports failures without claiming settings were saved", async () => {
  server.use(
    http.put(
      "*/admin/settings/battle",
      () => new HttpResponse(null, { status: 403 }),
    ),
  );
  render(<BattleSettingsManager />);
  await screen.findByLabelText("基本秒数");
  await userEvent.setup().click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "戦闘設定を操作できませんでした。",
  );
  expect(screen.queryByText("戦闘設定を保存しました")).not.toBeInTheDocument();
});
