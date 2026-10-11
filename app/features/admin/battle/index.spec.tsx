import { render, screen, waitFor, within } from "@testing-library/react";
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
    const input = (await request.json()) as {
      balance: typeof defaults;
      power: number;
      achievement: number;
      average_relations: number;
    };
    simulated(input);
    return HttpResponse.json({
      power: input.power,
      achievement: input.achievement,
      pool_quiz_count: 5,
      average_relations: input.average_relations,
      balance: input.balance,
      min_encounter_enemies: 1,
      max_encounter_enemies: 3,
      enemies: [
        { index: 1, quiz_count: 2, hp: 28, attack: 16, relations: 3 },
        { index: 2, quiz_count: 2, hp: 30, attack: 17, relations: 3 },
        { index: 3, quiz_count: 1, hp: 26, attack: 15, relations: 3 },
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
  expect(screen.getAllByRole("spinbutton")).toHaveLength(33);
  expect(screen.getByLabelText("敵能力のばらつき（±%）")).toHaveValue(10);
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
it("retains trials for comparison and lets users revisit their original settings", async () => {
  render(<BattleSettingsManager />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "試算して比較に追加" }),
    ).toBeEnabled(),
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "試算して比較に追加" }));
  const comparison = await screen.findByRole("table", { name: "試算比較" });
  expect(within(comparison).getAllByRole("row")).toHaveLength(2);
  expect(screen.getByRole("table", { name: "試算の敵一覧" })).toHaveTextContent(
    "28",
  );
  const power = screen.getByLabelText("試算するPower");
  await user.clear(power);
  await user.type(power, "250");
  const weight = screen.getByLabelText("PowerのHP補正");
  await user.clear(weight);
  await user.type(weight, "2");
  expect(within(comparison).getAllByRole("row")).toHaveLength(2);
  await user.click(screen.getByRole("button", { name: "試算して比較に追加" }));
  await waitFor(() =>
    expect(within(comparison).getAllByRole("row")).toHaveLength(3),
  );
  expect(comparison).toHaveTextContent("100");
  expect(comparison).toHaveTextContent("250");
  expect(
    screen.getByRole("heading", { name: "試算 2 の敵一覧" }),
  ).toBeInTheDocument();
  await user.click(screen.getByText("この試算に使ったゲームバランス設定"));
  const snapshot = screen
    .getByText("この試算に使ったゲームバランス設定")
    .closest("details");
  if (!snapshot) throw new Error("試算の設定が見つかりません。");
  expect(
    within(snapshot).getByText("PowerのHP補正").nextElementSibling,
  ).toHaveTextContent("2");
  await user.click(within(comparison).getByText("100"));
  expect(screen.getByRole("button", { name: "試算 1" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    within(snapshot).getByText("PowerのHP補正").nextElementSibling,
  ).toHaveTextContent("1");
  expect(
    screen.getByRole("heading", { name: "試算 1 の敵一覧" }),
  ).toBeInTheDocument();
  expect(simulated).toHaveBeenNthCalledWith(1, {
    balance: defaults,
    power: 100,
    achievement: 1,
    average_relations: 3,
  });
  expect(simulated).toHaveBeenNthCalledWith(2, {
    balance: { ...defaults, power_hp: 2 },
    power: 250,
    achievement: 1,
    average_relations: 3,
  });
  expect(saved).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "結果をクリア" }));
  expect(
    screen.queryByRole("table", { name: "試算比較" }),
  ).not.toBeInTheDocument();
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
