import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { defaultGoldSettings } from "~/features/game/rewards";
import RewardsEditor from "./RewardsEditor";
import * as files from "./gameSettingsFiles";

vi.mock("./gameSettingsFiles", () => ({
  exportGameSettings: vi.fn(),
  previewGameSettings: vi.fn(),
  saveGameSettings: vi.fn(),
}));
const document: files.GameSettingsDocument = {
  format: "tanbunism.game-settings",
  version: 1,
  catalog: {
    skills: [{ id: "buff", enabled: true }],
    items: [
      { id: "sword", name: "剣", enabled: true, skill_id: "buff" },
      { id: "shield", name: "盾", enabled: false, skill_id: "buff" },
    ],
    enemies: [],
    rewards: null,
  },
  balance: {
    base_hp: 35,
    chest_gold: 60,
    chest_healing_potions: 0,
    chest_step_potions: 1,
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(files.exportGameSettings).mockResolvedValue(
    structuredClone(document),
  );
  vi.mocked(files.previewGameSettings).mockImplementation(async (patch) => ({
    revision: "rev",
    backup: document,
    document: patch as files.GameSettingsDocument,
    changes: [],
  }));
  vi.mocked(files.saveGameSettings).mockImplementation(async (preview) => ({
    ...document,
    catalog: { ...document.catalog, ...preview.document.catalog },
    balance: { ...document.balance, ...preview.document.balance },
  }));
});

it("edits reward tables and saves only rewards and fixed chest fields atomically", async () => {
  const user = userEvent.setup();
  render(<RewardsEditor />);
  expect(await screen.findByLabelText("基本Gold")).toHaveValue(10);
  expect(screen.getByLabelText("敵ドロップの倍率")).toHaveValue(1);
  expect(screen.getByLabelText("宝箱の倍率")).toHaveValue(5);
  await user.click(screen.getByRole("button", { name: "＋ ドロップ候補" }));
  const table = within(
    screen.getByRole("region", { name: "新しいドロップ候補" }),
  );
  expect(table.queryByLabelText("基本Gold")).not.toBeInTheDocument();
  const interval = table.getByLabelText("段階が上がる達成度間隔");
  await user.clear(interval);
  await user.type(interval, "10");
  await user.click(table.getByRole("button", { name: "候補を追加" }));
  await user.click(table.getByRole("button", { name: "候補を追加" }));
  expect(
    table
      .getAllByLabelText("段階")
      .map((element) => (element as HTMLInputElement).value),
  ).toEqual(["1", "2"]);
  expect(table.getAllByRole("option", { name: "盾（無効）" })).toHaveLength(2);
  expect(files.saveGameSettings).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "保存" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "未開封の宝箱から反映",
  );
  expect(files.previewGameSettings).toHaveBeenCalledWith({
    format: "tanbunism.game-settings",
    version: 1,
    catalog: {
      rewards: {
        gold: defaultGoldSettings,
        chest_table_id: expect.any(String),
        tables: [
          expect.objectContaining({
            tier_interval: 10,
            entries: [
              { item_id: "sword", tier: 1, weight: 1, quantity: 1 },
              { item_id: "sword", tier: 2, weight: 1, quantity: 1 },
            ],
          }),
        ],
      },
    },
    balance: {
      chest_healing_potions: 0,
      chest_step_potions: 1,
    },
  });
  expect(files.saveGameSettings).toHaveBeenCalledWith(
    expect.objectContaining({ revision: "rev" }),
  );
});

it("removes a referenced table together with its chest selection", async () => {
  const user = userEvent.setup();
  render(<RewardsEditor />);
  await user.click(
    await screen.findByRole("button", { name: "＋ ドロップ候補" }),
  );
  expect(screen.getByLabelText("宝箱のドロップ候補")).not.toHaveValue("");
  await user.click(screen.getByRole("button", { name: "候補セットを削除" }));
  expect(screen.getByLabelText("宝箱のドロップ候補")).toHaveValue("");
  expect(screen.getByLabelText("基本Gold")).toHaveValue(10);
});

it("does not report success on validation failure and allows a retry", async () => {
  vi.mocked(files.previewGameSettings).mockRejectedValueOnce(
    new Error("同じ段階のアイテムが重複しています。"),
  );
  const user = userEvent.setup();
  render(<RewardsEditor />);
  await user.click(await screen.findByRole("button", { name: "保存" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("重複");
  expect(files.saveGameSettings).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(files.saveGameSettings).toHaveBeenCalledTimes(1));
});

it("retries an initial read failure", async () => {
  vi.mocked(files.exportGameSettings).mockRejectedValueOnce(
    new Error("通信エラー"),
  );
  render(<RewardsEditor />);
  await userEvent.click(await screen.findByRole("button", { name: "再読込" }));
  expect(await screen.findByLabelText("基本Gold")).toHaveValue(10);
});

it("saves Power, achievement, variance and source multipliers independently of item candidates", async () => {
  const user = userEvent.setup();
  render(<RewardsEditor />);
  const changes = [
    ["Power補正", "6"],
    ["達成度成長率 (%)", "30"],
    ["バラツキ (%)", "15"],
    ["敵ドロップの倍率", "1.5"],
    ["宝箱の倍率", "8"],
  ];
  await screen.findByLabelText("基本Gold");
  for (const [label, value] of changes) {
    const input = screen.getByLabelText(label);
    await user.clear(input);
    await user.type(input, value);
  }
  await user.selectOptions(screen.getByLabelText("GoldのPower計算"), "log");
  await user.click(screen.getByRole("button", { name: "＋ ドロップ候補" }));
  await user.click(screen.getByRole("button", { name: "候補セットを削除" }));
  await user.click(screen.getByRole("button", { name: "保存" }));
  await screen.findByRole("status");
  expect(files.previewGameSettings).toHaveBeenCalledWith(
    expect.objectContaining({
      catalog: {
        rewards: {
          gold: {
            ...defaultGoldSettings,
            power_coefficient: 6,
            achievement_growth_percent: 30,
            variance_percent: 15,
            enemy_multiplier: 1.5,
            chest_multiplier: 8,
            power_formula: "log",
          },
          tables: [],
          chest_table_id: null,
        },
      },
    }),
  );
});
