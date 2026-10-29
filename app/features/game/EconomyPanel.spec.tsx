import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { SWRConfig } from "swr";
import { beforeEach, expect, it, vi } from "vitest";
import EconomyPanel from "./EconomyPanel";
import { gameRequest } from "./battle";
import { enterDungeon, newSave } from "./domain";

vi.mock("./battle", async (original) => ({
  ...(await original<typeof import("./battle")>()),
  gameRequest: vi.fn(),
}));
const products = [
  { id: "bronze_sword", name: "銅の剣", price: 100, kind: "weapon", amount: 3 },
  {
    id: "step_potion",
    name: "歩数回復薬",
    price: null,
    kind: "moves",
    amount: 3,
  },
];
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(gameRequest).mockResolvedValue({
    products,
    review: { done: 3, total: 30, claimed: false },
  });
});
function show(shop: boolean, disabled = false) {
  const onSaved = vi.fn();
  const save = {
    ...enterDungeon(newSave(), "book", "本", 1),
    economy: {
      gold: 120,
      inventory: { step_potion: 1 },
      weapon: null,
      weapon_attack: 0,
    },
  };
  if (save.run) save.run = { ...save.run, moves: 5, phase: "rest" };
  render(
    <MemoryRouter>
      <SWRConfig value={{ provider: () => new Map() }}>
        <EconomyPanel
          userId="user"
          save={save}
          revision={7}
          shop={shop}
          disabled={disabled}
          onSaved={onSaved}
          onTab={vi.fn()}
        />
      </SWRConfig>
    </MemoryRouter>,
  );
  return { onSaved, save };
}
it("purchases with the displayed state's revision and applies the returned balance", async () => {
  const { onSaved, save } = show(true);
  const button = await screen.findByRole("button", { name: "100 G" });
  expect(screen.getByText("攻 +3 · 30回使用可")).toBeVisible();
  const result = {
    revision: 8,
    save: { ...save, economy: { ...save.economy, gold: 20 } },
  };
  vi.mocked(gameRequest).mockResolvedValueOnce(result);
  await userEvent.setup().click(button);
  expect(gameRequest).toHaveBeenCalledWith("shop/buy", {
    revision: 7,
    product_id: "bronze_sword",
  });
  expect(onSaved).toHaveBeenCalledWith(result);
});

it("groups owned items in category order and keeps explicit categories independent of effects", async () => {
  const grouped = [
    { id: "other", name: "お守り", kind: "skill", category: "other" },
    {
      id: "key",
      name: "本の鍵",
      kind: "dungeon_unlock",
      category: "unlock_key",
    },
    { id: "recovery", name: "回復薬", kind: "hp", category: "recovery" },
    { id: "armor", name: "盾", kind: "weapon", category: "armor" },
    { id: "weapon", name: "剣", kind: "weapon", category: "weapon" },
    { id: "unowned", name: "未所持の品", kind: "hp", category: "recovery" },
  ].map((product) => ({ ...product, amount: 10, price: null }));
  vi.mocked(gameRequest).mockResolvedValue({ products: grouped });
  const save = {
    ...newSave(),
    economy: {
      gold: 0,
      inventory: Object.fromEntries(grouped.slice(0, -1).map((p) => [p.id, 1])),
      weapon: null,
      weapon_attack: 0,
    },
  };
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <EconomyPanel
        userId="grouped"
        save={save}
        revision={1}
        shop={false}
        disabled={false}
        onSaved={vi.fn()}
        onTab={vi.fn()}
      />
    </SWRConfig>,
  );
  await screen.findByRole("region", { name: "武器" });
  expect(
    screen.getAllByRole("region").map((r) => r.getAttribute("aria-label")),
  ).toEqual(["武器", "防具", "回復", "開放キー", "その他"]);
  expect(
    within(screen.getByRole("region", { name: "防具" })).getByText("盾"),
  ).toBeVisible();
  expect(screen.queryByText("未所持の品")).not.toBeInTheDocument();
});

it("hides empty categories and groups old API products without a category", async () => {
  show(false);
  await screen.findByRole("region", { name: "回復" });
  expect(
    screen.queryByRole("region", { name: "武器" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "防具" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "その他" }),
  ).not.toBeInTheDocument();
});

it.each([null, "half"])(
  "buys a permanent gambit unlock rather than a consumable (%s)",
  async (variantId) => {
    const unlockId = variantId ? `low_hp:${variantId}` : "low_hp";
    const product = {
      id: `gambit:${unlockId}`,
      trigger_id: "low_hp",
      trigger_variant_id: variantId,
      name: "HP30%以下の味方",
      price: 100,
      kind: "gambit",
      amount: 0,
    };
    vi.mocked(gameRequest).mockResolvedValueOnce({ products: [product] });
    const { onSaved, save } = show(true);
    const buy = await screen.findByRole("button", { name: "100 G" });
    expect(screen.getByText("トリガーを永久解放")).toBeVisible();
    expect(screen.queryByText(/回使用可/)).not.toBeInTheDocument();
    const result = {
      revision: 8,
      save: {
        ...save,
        economy: { ...save.economy, gold: 20, unlocked_triggers: [unlockId] },
      },
    };
    vi.mocked(gameRequest).mockResolvedValueOnce(result);
    await userEvent.setup().click(buy);
    expect(gameRequest).toHaveBeenCalledWith("shop/buy", {
      revision: 7,
      product_id: `gambit:${unlockId}`,
    });
    expect(onSaved).toHaveBeenCalledWith(result);
    expect(await screen.findByText("ガンビットを解放しました。")).toBeVisible();
  },
);
it("describes the shared buff effects of equipment", async () => {
  vi.mocked(gameRequest).mockResolvedValueOnce({
    products: [
      {
        ...products[0],
        equipment_buffs: [
          { stat: "defense", amount: 4, amount_mode: "fixed" },
          { stat: "specialAttack", amount: 50, amount_mode: "percent" },
        ],
      },
    ],
  });
  show(true);
  expect(
    await screen.findByText("守 +4 · 特攻 +50% · 30回使用可"),
  ).toBeVisible();
  expect(screen.queryByText("攻 +3 · 30回使用可")).not.toBeInTheDocument();
});

it("describes elemental equipment as increased power and resistance", async () => {
  vi.mocked(gameRequest).mockResolvedValueOnce({
    products: [
      {
        ...products[0],
        element_names: { fire: "炎", ice: "氷" },
        equipment_buffs: [
          {
            stat: "damageDealt",
            affected_element: "fire",
            amount: 25,
            amount_mode: "percent",
          },
          {
            stat: "damageTaken",
            affected_element: "ice",
            amount: 25,
            amount_mode: "percent",
          },
        ],
      },
    ],
  });
  show(true);
  expect(
    await screen.findByText("炎 属性威力 +25% · 氷 属性耐性 +25% · 30回使用可"),
  ).toBeVisible();
});

it("uses an owned step potion without showing review tasks in the inventory", async () => {
  show(false);
  const name = await screen.findByText("歩数回復薬");
  const row = name.closest("div.flex");
  if (!row) throw new Error("Missing inventory row");
  await userEvent
    .setup()
    .click(within(row as HTMLElement).getByRole("button", { name: "使う" }));
  expect(gameRequest).toHaveBeenCalledWith("inventory/use", {
    revision: 7,
    product_id: "step_potion",
  });
  expect(
    screen.queryByRole("link", { name: "復習へ" }),
  ).not.toBeInTheDocument();
});
it("disables purchases during battle", async () => {
  show(true, true);
  expect(await screen.findByRole("button", { name: "100 G" })).toBeDisabled();
});

function showDungeonKey({
  opened = false,
  disabled = false,
  shop = false,
} = {}) {
  const id = "@dungeon:resource";
  const save = {
    ...newSave(),
    economy: {
      gold: 0,
      inventory: { [id]: 1 },
      weapon: null,
      weapon_attack: 0,
    },
  };
  vi.mocked(gameRequest).mockResolvedValue({
    products: [
      {
        id,
        name: "読書メモのダンジョン開放キー",
        kind: "dungeon_unlock",
        resource_id: "resource",
        price: null,
        amount: 0,
        max_uses: 1,
        icon: "key",
        enabled: !opened,
      },
    ],
  });
  const onSaved = vi.fn();
  render(
    <MemoryRouter>
      <SWRConfig value={{ provider: () => new Map() }}>
        <EconomyPanel
          userId="user"
          save={save}
          revision={3}
          shop={shop}
          disabled={disabled}
          onSaved={onSaved}
          onTab={vi.fn()}
        />
      </SWRConfig>
    </MemoryRouter>,
  );
  return { id, save, onSaved };
}

it("uses a resource-bound key before starting any dungeon and applies the server's unlock", async () => {
  const { id, save, onSaved } = showDungeonKey();
  const button = await screen.findByRole("button", { name: "開放する" });
  expect(button).toBeEnabled();
  const result = {
    revision: 4,
    save: {
      ...save,
      unlockedDungeons: [
        {
          sourceId: "resource",
          resourceId: "resource",
          name: "読書メモ",
          achievement: 0,
          source: "item",
        },
      ],
    },
  };
  vi.mocked(gameRequest).mockResolvedValueOnce(result);
  await userEvent.setup().click(button);
  expect(gameRequest).toHaveBeenCalledWith("inventory/use", {
    revision: 3,
    product_id: id,
  });
  expect(onSaved).toHaveBeenCalledWith(result);
  expect(screen.getByRole("status")).toHaveTextContent(
    "ダンジョンを開放しました",
  );
});

it("does not consume a key for an already opened dungeon", async () => {
  showDungeonKey({ opened: true });
  expect(
    await screen.findByRole("button", { name: "開放済み" }),
  ).toBeDisabled();
});

it("does not allow using keys during battle", async () => {
  showDungeonKey({ disabled: true });
  expect(
    await screen.findByRole("button", { name: "開放する" }),
  ).toBeDisabled();
});

it("never sells the import reward in the shop", async () => {
  showDungeonKey({ shop: true });
  await waitFor(() =>
    expect(screen.queryByText("読み込み中…")).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByText("読書メモのダンジョン開放キー"),
  ).not.toBeInTheDocument();
});
