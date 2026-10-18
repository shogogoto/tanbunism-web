import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { vi } from "vitest";
import { defaultBalance as defaults } from "~/features/game/battle";
import BattleSettingsManager from ".";
const saved = vi.fn();
const simulated = vi.fn();
const practiceStarted = vi.fn();
const server = setupServer(
  http.get("*/admin/users", () => HttpResponse.json([])),
  http.get("*/admin/game/dungeons", () => HttpResponse.json([])),
  http.get("*/admin/settings/game-balance", () => HttpResponse.json(defaults)),
  http.post(
    "*/admin/settings/game-balance/practice/simulation",
    async ({ request }) => {
      practiceStarted(await request.json());
      return HttpResponse.json(
        { detail: "試算リクエストを確認" },
        { status: 409 },
      );
    },
  ),
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
      requested_enemy_types: 3,
      requested_quiz_count: 1,
      assigned_quiz_count: 3,
      unassigned_quiz_count: 2,
      warnings: [],
      enemies: [
        { index: 1, quiz_count: 2, hp: 28, attack: 16, relations: 3 },
        { index: 2, quiz_count: 2, hp: 30, attack: 17, relations: 3 },
        { index: 3, quiz_count: 1, hp: 26, attack: 15, relations: 3 },
      ],
    });
  }),
);

it("saves the speed formula, base speed, and allocation coefficient", async () => {
  const user = userEvent.setup();
  render(<BattleSettingsManager />);
  const formula = await screen.findByRole("combobox", {
    name: "速さの計算方式",
  });
  expect(formula).toHaveValue("sqrt");
  await user.selectOptions(formula, "linear");
  await user.clear(screen.getByLabelText("初期速さ"));
  await user.type(screen.getByLabelText("初期速さ"), "12");
  const coefficient = within(
    screen.getByRole("region", { name: "育成ポイントあたりの上昇量" }),
  ).getByLabelText("速さ");
  await user.clear(coefficient);
  await user.type(coefficient, "2");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() =>
    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({
        speed_formula: "linear",
        base_speed: 12,
        speed_per_point: 2,
      }),
    ),
  );
});

it("places ordinary labels above their inputs and preserves editable formulas", async () => {
  render(<BattleSettingsManager />);
  const hp = await screen.findByLabelText("初期HP");
  const label = document.querySelector(`label[for="${hp.id}"]`);
  expect(label?.parentElement).toBe(hp.parentElement);
  expect(label?.nextElementSibling).toBe(hp);
  expect(hp).toHaveAttribute("min", "1");
  expect(hp).toHaveAttribute("max", "10000");
  expect(hp).toHaveAttribute("form", "game-settings");
  const damage = screen.getByRole("region", { name: "ダメージ計算" });
  expect(within(damage).getByText("ダメージ ≈ max(1, (")).toBeVisible();
  expect(within(damage).getByLabelText("倍率")).toHaveValue(1);
});

it("edits the shared contents of unopened region chests", async () => {
  const user = userEvent.setup();
  render(<BattleSettingsManager />);
  const gold = await screen.findByLabelText("ゴールド / 宝箱");
  await user.clear(gold);
  await user.type(gold, "80");
  const potion = screen.getByLabelText("歩数回復薬 / 宝箱");
  await user.clear(potion);
  await user.type(potion, "2");
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() =>
    expect(saved).toHaveBeenCalledWith(
      expect.objectContaining({ chest_gold: 80, chest_step_potions: 2 }),
    ),
  );
});
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());
it("saves tempo seconds and rejects an inverted speed order", async () => {
  render(<BattleSettingsManager />);
  const user = userEvent.setup();
  const slow = await screen.findByLabelText("遅（秒）");
  const medium = screen.getByLabelText("中（秒）");
  const fast = screen.getByLabelText("速（秒）");
  expect(slow).toHaveValue(3);
  expect(medium).toHaveValue(1);
  expect(fast).toHaveValue(0.5);
  await user.clear(fast);
  await user.type(fast, "2");
  await user.click(screen.getAllByRole("button", { name: "保存" })[0]);
  expect(saved).not.toHaveBeenCalled();
  expect(
    await screen.findByText("戦闘テンポは遅・中・速の順に短くしてください。"),
  ).toBeVisible();
  await user.clear(fast);
  await user.type(fast, "0.7");
  await user.click(screen.getAllByRole("button", { name: "保存" })[0]);
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0]).toMatchObject({
    battle_tempo_slow_seconds: 3,
    battle_tempo_medium_seconds: 1,
    battle_tempo_fast_seconds: 0.7,
  });
});
it("saves player time and live enemy corrections without quiz-type weights", async () => {
  render(<BattleSettingsManager />);
  const user = userEvent.setup();
  const base = await screen.findByLabelText("初期持ち時間（秒）");
  expect(base).toHaveValue(45);
  expect(
    screen.getByRole("region", { name: "敵ステータスの計算" }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("関係数のHP補正")).not.toBeInTheDocument();
  expect(screen.getByLabelText("達成度あたりの固定クイズ数")).toHaveValue(1);
  expect(screen.getByLabelText("敵能力のばらつき（±%）")).toHaveValue(10);
  expect(base).toHaveAttribute("min", "5");
  expect(base).toHaveAttribute("max", "300");
  const weight = screen.getByLabelText("PowerのHP補正");
  await user.clear(weight);
  await user.type(weight, "2");
  const hpGrowth = screen.getByLabelText("達成度帯ごとのHP成長率（%）");
  expect(hpGrowth).toHaveValue(20);
  await user.clear(hpGrowth);
  await user.type(hpGrowth, "30");
  const effectLabel = screen.getByLabelText("演出4の文言");
  await user.clear(effectLabel);
  await user.type(effectLabel, "大当たり");
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
    region_hp_growth_percent: 30,
    damage_effect_label_4: "大当たり",
    enemy_types: 4,
  });
});

it("saves MP base and allocation alongside the draft battle settings", async () => {
  render(<BattleSettingsManager />);
  const user = userEvent.setup();
  const base = await screen.findByLabelText("初期MP");
  await user.clear(base);
  await user.type(base, "15");
  const perPoint = within(
    screen.getByRole("region", { name: "育成ポイントあたりの上昇量" }),
  ).getByLabelText(/^MP(?: \/ 育成ポイント)?$/);
  await user.clear(perPoint);
  await user.type(perPoint, "4");
  await user.click(screen.getAllByRole("button", { name: "保存" })[0]);
  await waitFor(() => expect(saved).toHaveBeenCalled());
  expect(saved.mock.calls[0][0]).toMatchObject({
    base_mp: 15,
    mp_per_point: 4,
  });
});
it("retains trials for comparison and lets users revisit their original settings", async () => {
  render(<BattleSettingsManager />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "敵を試算して比較に追加" }),
    ).toBeEnabled(),
  );
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "敵を試算して比較に追加" }),
  );
  const comparison = await screen.findByRole("table", {
    name: "敵の試算比較",
  });
  expect(within(comparison).getAllByRole("row")).toHaveLength(2);
  expect(screen.getByRole("table", { name: "試算の敵一覧" })).toHaveTextContent(
    "28",
  );
  const power = screen.getByLabelText("敵の生成に使うPower");
  await user.clear(power);
  await user.type(power, "250");
  const weight = screen.getByLabelText("PowerのHP補正");
  await user.clear(weight);
  await user.type(weight, "2");
  expect(within(comparison).getAllByRole("row")).toHaveLength(2);
  await user.click(
    screen.getByRole("button", { name: "敵を試算して比較に追加" }),
  );
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
    average_relations: 0,
  });
  expect(simulated).toHaveBeenNthCalledWith(2, {
    balance: { ...defaults, power_hp: 2 },
    power: 250,
    achievement: 1,
    average_relations: 0,
  });
  expect(saved).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "結果をクリア" }));
  expect(
    screen.queryByRole("table", { name: "敵の試算比較" }),
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

it("practices with the selected historical enemy trial and current unsaved initial values", async () => {
  render(<BattleSettingsManager />);
  await screen.findByLabelText("初期HP");
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "敵を試算して比較に追加" }),
  );
  await screen.findByRole("table", { name: "敵の試算比較" });
  const power = screen.getByLabelText("敵の生成に使うPower");
  await user.clear(power);
  await user.type(power, "250");
  await user.click(
    screen.getByRole("button", { name: "敵を試算して比較に追加" }),
  );
  await screen.findByRole("heading", { name: "試算 2 の敵一覧" });
  await user.click(screen.getByRole("button", { name: "試算 1" }));
  const initialHp = screen.getByLabelText("初期HP");
  await user.clear(initialHp);
  await user.type(initialHp, "70");
  const enemyHp = screen.getByLabelText("敵の基礎HP");
  await user.clear(enemyHp);
  await user.type(enemyHp, "99");
  await user.click(
    screen.getByRole("button", { name: "現在の設定で模擬戦を開始" }),
  );
  await screen.findByText("試算リクエストを確認");
  expect(practiceStarted).toHaveBeenCalledWith(
    expect.objectContaining({
      balance: { ...defaults, base_hp: 70, enemy_hp: 99 },
      simulation: expect.objectContaining({
        power: 100,
        balance: defaults,
        enemies: expect.arrayContaining([
          expect.objectContaining({ hp: 28, attack: 16 }),
        ]),
      }),
    }),
  );
  expect(saved).not.toHaveBeenCalled();
});

it("combines enemy stats and roster previews and places practice last", async () => {
  render(<BattleSettingsManager />);
  await screen.findByLabelText("初期HP");
  const stats = screen.getByRole("region", { name: "敵ステータスの計算" });
  expect(
    screen.getByRole("heading", { name: "実戦形式の模擬戦" }),
  ).toBeVisible();
  const roster = screen.getByRole("region", { name: "敵ロスターと遭遇の抽選" });
  const practice = screen.getByRole("region", { name: "実戦形式の模擬戦" });
  const preview = within(practice).getByRole("region", {
    name: "敵の生成プレビュー",
  });
  expect(preview).toBeInTheDocument();
  expect(
    roster.compareDocumentPosition(practice) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  const user = userEvent.setup();
  await user.click(
    within(preview).getByRole("button", {
      name: "敵を試算して比較に追加",
    }),
  );
  const comparison = await within(preview).findByRole("table", {
    name: "敵の試算比較",
  });
  expect(comparison).toBeVisible();
  expect(within(preview).getByText(/未割り当て 2問/)).toBeVisible();
  const enemies = within(preview).getByRole("table", {
    name: "試算の敵一覧",
  });
  expect(enemies).toHaveTextContent("固定クイズ数");
  expect(enemies).toHaveTextContent("HP");
  expect(enemies).toHaveTextContent("攻撃力");
  expect(
    screen.queryByRole("button", { name: "この試算を模擬戦に使う" }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("敵の出典")).toHaveValue("trial");
  expect(screen.getByLabelText("敵の試算")).toHaveTextContent("敵の試算 1");
  expect(
    screen.getByRole("button", { name: "現在の設定で模擬戦を開始" }),
  ).toBeEnabled();
  expect(within(stats).queryByRole("table")).not.toBeInTheDocument();
  expect(document.querySelector("form form")).toBeNull();
  expect(saved).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "結果をクリア" }));
  await waitFor(() =>
    expect(screen.getByLabelText("敵の出典")).toHaveValue("draft"),
  );
  expect(
    screen.queryByRole("combobox", { name: "敵の試算" }),
  ).not.toBeInTheDocument();
});

it("generates practice enemies directly from current unsaved stats, roster and shared conditions", async () => {
  render(<BattleSettingsManager />);
  const user = userEvent.setup();
  await screen.findByLabelText("初期HP");
  for (const [label, value] of [
    ["初期HP", "70"],
    ["敵の基礎HP", "99"],
    ["領域ごとの敵の種類数", "4"],
    ["敵の生成に使うPower", "350"],
    ["敵の生成に使う達成度", "3"],
  ]) {
    const input = screen.getByLabelText(label);
    await user.clear(input);
    await user.type(input, value);
  }
  expect(screen.getByLabelText("敵の出典")).toHaveValue("draft");
  await user.click(
    screen.getByRole("button", { name: "現在の設定で模擬戦を開始" }),
  );
  await screen.findByText("試算リクエストを確認");
  expect(simulated).toHaveBeenCalledWith({
    balance: { ...defaults, base_hp: 70, enemy_hp: 99, enemy_types: 4 },
    power: 350,
    achievement: 3,
    average_relations: 0,
  });
  expect(practiceStarted).toHaveBeenCalledWith(
    expect.objectContaining({
      simulation: expect.objectContaining({
        power: 350,
        achievement: 3,
        balance: expect.objectContaining({ enemy_hp: 99, enemy_types: 4 }),
      }),
    }),
  );
  expect(saved).not.toHaveBeenCalled();
});
