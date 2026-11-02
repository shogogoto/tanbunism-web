import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SWRConfig } from "swr";
import { beforeEach, expect, it, vi } from "vitest";
import EquipmentPanel from "./EquipmentPanel";
import { gameRequest } from "./battle";
import { newSave } from "./domain";
import { equipmentSlots } from "./equipmentSlots";
import type { GameState } from "./state";

vi.mock("./battle", async (original) => ({
  ...(await original<typeof import("./battle")>()),
  gameRequest: vi.fn(),
}));
const products = [
  {
    id: "sword",
    name: "銅剣",
    kind: "weapon",
    equipment_part: "arm",
    max_uses: 30,
    amount: 3,
    equipment_buffs: [{ stat: "attack", amount: 3, amount_mode: "fixed" }],
  },
  {
    id: "armor",
    name: "鎧",
    kind: "weapon",
    equipment_part: "body",
    max_uses: 30,
  },
  {
    id: "boots",
    name: "革の靴",
    kind: "weapon",
    equipment_part: "feet",
    max_uses: 30,
  },
  { id: "potion", name: "回復薬", kind: "hp" },
];
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(gameRequest).mockResolvedValue({ products });
});
function show(disabled = false) {
  const state: GameState = {
    revision: 7,
    save: {
      ...newSave(),
      economy: {
        gold: 100,
        inventory: { sword: 1, armor: 1, boots: 1, potion: 1 },
        weapon: "sword",
        weapon_attack: 3,
        remaining_uses: { sword: 8 },
        equipment: {
          arm1: {
            item_id: "sword",
            max_uses: 30,
            defensive: false,
            buffs: [{ stat: "attack", amount: 3, amount_mode: "fixed" }],
          },
        },
      },
    },
  };
  const onSaved = vi.fn();
  function View() {
    const [current, setCurrent] = useState(state);
    return (
      <EquipmentPanel
        userId="player"
        save={current.save}
        revision={current.revision}
        disabled={disabled}
        onSaved={(next) => {
          onSaved(next);
          setCurrent(next);
        }}
      />
    );
  }
  render(
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      <View />
    </SWRConfig>,
  );
  return { state, onSaved, user: userEvent.setup() };
}

it("shows seven slots with their compatible owned items and remaining uses", async () => {
  show();
  await waitFor(() => expect(screen.getByLabelText("腕1")).toBeEnabled());
  for (const slot of equipmentSlots)
    expect(screen.getByLabelText(slot.label)).toBeVisible();
  expect(
    within(screen.getByLabelText("腕1の装備効果")).getByText("耐久 8/30回"),
  ).toBeVisible();
  expect(
    within(screen.getByLabelText("腕1の装備効果")).getByText("攻撃力 +3"),
  ).toBeVisible();
  expect(
    within(screen.getByLabelText("体")).getByRole("option", { name: /^鎧/ }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByLabelText("体")).queryByRole("option", {
      name: /^銅剣/,
    }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("option", { name: "回復薬" }),
  ).not.toBeInTheDocument();
});

it("moves a piece to another arm using the current revision and keeps durability", async () => {
  const { state, onSaved, user } = show();
  await waitFor(() => expect(screen.getByLabelText("腕2")).toBeEnabled());
  const next = structuredClone(state);
  next.revision++;
  const economy = next.save.economy;
  if (!economy?.equipment) throw new Error("Missing equipment");
  economy.equipment = { arm2: economy.equipment.arm1 };
  vi.mocked(gameRequest).mockResolvedValue(next);
  await user.selectOptions(screen.getByLabelText("腕2"), "sword");
  expect(gameRequest).toHaveBeenLastCalledWith("inventory/equip", {
    revision: 7,
    product_id: "sword",
    slot: "arm2",
  });
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(next));
  expect(screen.getByLabelText("腕1")).toHaveValue("");
  expect(screen.getByLabelText("腕2")).toHaveValue("sword");
  expect(
    within(screen.getByLabelText("腕2の装備効果")).getByText("耐久 8/30回"),
  ).toBeVisible();
});

it("unequips the item in the chosen slot", async () => {
  const { state, user } = show();
  await waitFor(() => expect(screen.getByLabelText("腕1")).toBeEnabled());
  vi.mocked(gameRequest).mockResolvedValue({
    ...state,
    revision: 8,
    save: {
      ...state.save,
      economy: {
        ...state.save.economy,
        equipment: {},
        weapon: null,
        weapon_attack: 0,
      },
    },
  });
  await user.selectOptions(screen.getByLabelText("腕1"), "");
  expect(gameRequest).toHaveBeenLastCalledWith("inventory/equip", {
    revision: 7,
    product_id: "sword",
    slot: "arm1",
  });
});

it("prevents equipment changes during combat", async () => {
  show(true);
  await screen.findByRole("option", { name: /^鎧/ });
  for (const slot of equipmentSlots)
    expect(screen.getByLabelText(slot.label)).toBeDisabled();
});

it("describes candidate effects and their own remaining durability before equipping", async () => {
  vi.mocked(gameRequest).mockResolvedValueOnce({
    products: products.map((product) =>
      product.id === "armor"
        ? {
            ...product,
            equipment_buffs: [
              { stat: "maxHp", amount: 20, amount_mode: "percent" },
              { stat: "maxMp", amount: 10, amount_mode: "fixed" },
              { stat: "speed", amount: 2, amount_mode: "fixed" },
              {
                stat: "damageTaken",
                amount: 25,
                amount_mode: "percent",
                affected_element: "fire",
              },
            ],
            element_names: { fire: "炎" },
          }
        : product,
    ),
  });
  show();
  expect(
    await screen.findByRole("option", {
      name: "鎧 · 最大HP +20% · 最大MP +10 · 速さ +2 · 炎 属性耐性 +25% · 耐久 30/30回",
    }),
  ).toBeVisible();
});

it("keeps the equipped snapshot's effects and maximum uses after catalog edits", async () => {
  vi.mocked(gameRequest).mockResolvedValueOnce({
    products: products.map((product) =>
      product.id === "sword"
        ? {
            ...product,
            max_uses: 99,
            equipment_buffs: [
              { stat: "attack", amount: 99, amount_mode: "fixed" },
            ],
          }
        : product,
    ),
  });
  show();
  await waitFor(() => expect(screen.getByLabelText("腕1")).toBeEnabled());
  const details = screen.getByLabelText("腕1の装備効果");
  expect(details).toHaveTextContent("攻撃力 +3");
  expect(details).toHaveTextContent("耐久 8/30回");
  expect(details).not.toHaveTextContent("99");
});

it("shows saved equipment effects even when the item disappears from the catalog", async () => {
  vi.mocked(gameRequest).mockResolvedValueOnce({ products: [] });
  show();
  await waitFor(() => expect(screen.getByLabelText("腕1")).toBeEnabled());
  expect(screen.getByLabelText("腕1の装備効果")).toHaveTextContent("攻撃力 +3");
  expect(screen.getByLabelText("腕1の装備効果")).toHaveTextContent(
    "耐久 8/30回",
  );
});
