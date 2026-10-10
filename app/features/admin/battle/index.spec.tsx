import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { defaultBalance as defaults } from "~/features/game/battle";
import BattleSettingsManager from ".";
const saved = vi.fn();
const simulated = vi.fn();
const server = setupServer(
  http.get("*/admin/settings/game-balance", () => HttpResponse.json(defaults)),
  http.put("*/admin/settings/game-balance", async ({ request }) => {
    const body = await request.json();
    saved(body);
    return HttpResponse.json(body);
  }),
  http.post("*/admin/settings/game-balance/simulate", async ({ request }) => {
    simulated(await request.json());
    return HttpResponse.json({
      power: 100,
      achievement: 1,
      pool_quiz_count: 5,
      average_relations: 3,
      balance: defaults,
      min_encounter_enemies: 1,
      max_encounter_enemies: 3,
      enemies: [
        { index: 1, quiz_count: 2, hp: 28, attack: 16, relations: 3 },
        { index: 2, quiz_count: 2, hp: 28, attack: 16, relations: 3 },
        { index: 3, quiz_count: 1, hp: 28, attack: 16, relations: 3 },
      ],
    });
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
    screen.getByRole("region", { name: "敵ステータスの計算" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("spinbutton")).toHaveLength(22);
  expect(base).toHaveAttribute("min", "5");
  expect(base).toHaveAttribute("max", "300");
  const weight = screen.getByLabelText("PowerのHP補正");
  await user.clear(weight);
  await user.type(weight, "2");
  const enemyTypes = screen.getByLabelText("領域ごとの敵の種類数");
  await user.clear(enemyTypes);
  await user.type(enemyTypes, "4");
  expect(
    screen.queryByLabelText("単文組 → 関係の重み"),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(
    await screen.findByText("ゲーム設定を保存しました"),
  ).toBeInTheDocument();
  expect(saved).toHaveBeenCalledWith({
    ...defaults,
    power_hp: 2,
    enemy_types: 4,
  });
});
it("simulates roster sizes and enemy stats from power, achievement, and relation count", async () => {
  render(<BattleSettingsManager view="simulation" />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "試算する" })).toBeEnabled(),
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "試算する" }));
  expect(
    await screen.findByRole("table", { name: "敵ステータス結果" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("row")).toHaveLength(15);
  expect(screen.getAllByText("28")).toHaveLength(6);
  expect(screen.getAllByText("16")).toHaveLength(6);
  expect(screen.getByText("前回の試算条件")).toBeInTheDocument();
  expect(screen.getByText("100")).toBeInTheDocument();
  expect(
    await screen.findByRole("table", { name: "敵ロスター結果" }),
  ).toBeInTheDocument();
  const power = screen.getByLabelText("試算するPower");
  await user.clear(power);
  await user.type(power, "250");
  expect(
    screen.getByRole("table", { name: "敵ロスター結果" }),
  ).toBeInTheDocument();
  expect(screen.getByText("前回の試算条件").parentElement).toHaveTextContent(
    "100",
  );
  expect(simulated).toHaveBeenCalledWith({
    balance: defaults,
    power: 100,
    achievement: 1,
    average_relations: 3,
  });
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
