import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { defaultBalance as defaults } from "~/features/game/battle";
import BattleSettingsManager from ".";
const saved = vi.fn();
const server = setupServer(
  http.get("*/admin/settings/game-balance", () => HttpResponse.json(defaults)),
  http.put("*/admin/settings/game-balance", async ({ request }) => {
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
it("saves player time and live enemy corrections without quiz-type weights", async () => {
  render(<BattleSettingsManager />);
  const user = userEvent.setup();
  const base = await screen.findByLabelText("初期持ち時間（秒）");
  expect(base).toHaveValue(45);
  expect(
    screen.getByRole("table", { name: "ゲームバランス設定" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("spinbutton")).toHaveLength(19);
  expect(base).toHaveAttribute("min", "5");
  expect(base).toHaveAttribute("max", "300");
  const weight = screen.getByLabelText("PowerのHP補正");
  await user.clear(weight);
  await user.type(weight, "2");
  expect(
    screen.queryByLabelText("単文組 → 関係の重み"),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(
    await screen.findByText("ゲーム設定を保存しました"),
  ).toBeInTheDocument();
  expect(saved).toHaveBeenCalledWith({ ...defaults, power_hp: 2 });
});
it("reports failures without claiming settings were saved", async () => {
  server.use(
    http.put(
      "*/admin/settings/game-balance",
      () => new HttpResponse(null, { status: 403 }),
    ),
  );
  render(<BattleSettingsManager />);
  await screen.findByLabelText("初期持ち時間（秒）");
  await userEvent.setup().click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "ゲーム設定を操作できませんでした。",
  );
  expect(
    screen.queryByText("ゲーム設定を保存しました"),
  ).not.toBeInTheDocument();
});
