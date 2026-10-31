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
          arm1: { item_id: "sword", max_uses: 30, defensive: false },
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
  expect(screen.getByText("残り 8回")).toBeVisible();
  expect(
    within(screen.getByLabelText("体")).getByRole("option", { name: "鎧" }),
  ).toBeInTheDocument();
  expect(
    within(screen.getByLabelText("体")).queryByRole("option", { name: "銅剣" }),
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
  expect(screen.getByText("残り 8回")).toBeVisible();
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
  await screen.findByRole("option", { name: "鎧" });
  for (const slot of equipmentSlots)
    expect(screen.getByLabelText(slot.label)).toBeDisabled();
});
