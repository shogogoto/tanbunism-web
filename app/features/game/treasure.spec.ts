import { expect, it } from "vitest";
import { chestMessage } from "./treasure";

it("describes acquired names and merges fixed items without duplicating them", () => {
  expect(
    chestMessage({
      gold: 50,
      healing_potion: 0,
      step_potion: 1,
      items: {
        steel_sword: { name: "鋼剣", quantity: 2 },
        step_potion: { name: "保存された歩数薬", quantity: 2 },
      },
    }),
  ).toBe("50 G、鋼剣 ×2、保存された歩数薬 ×3 が入っていた。");
});
it("continues to describe old chest snapshots", () => {
  expect(chestMessage({ gold: 30, healing_potion: 1, step_potion: 0 })).toBe(
    "30 G、回復薬 ×1 が入っていた。",
  );
  expect(chestMessage({ gold: 0, healing_potion: 0, step_potion: 0 })).toBe(
    "中は空だった。",
  );
});
