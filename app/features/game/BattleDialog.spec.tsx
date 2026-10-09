import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import BattleDialog from "./BattleDialog";
import { enterDungeon, move, newSave } from "./domain";

const battle = () => {
  const run = move(
    enterDungeon(newSave(), "book", "本", 1),
    "sentence",
    0.1,
  ).run;
  if (!run) throw new Error("Missing run");
  return run;
};

it("separates enemy HP from named player HP in the floating battle", () => {
  render(
    <BattleDialog run={battle()} playerName="テストプレイヤー" busy={false}>
      <button type="button">回答</button>
    </BattleDialog>,
  );
  const dialog = screen.getByRole("dialog", { name: "敵と遭遇" });
  expect(within(dialog).getByRole("region", { name: "敵" })).toHaveTextContent(
    "敵HP 20/20",
  );
  const player = within(dialog).getByRole("region", { name: "プレイヤー" });
  const enemy = within(dialog).getByRole("region", { name: "敵" });
  expect(
    player.compareDocumentPosition(enemy) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(player).toHaveTextContent("テストプレイヤー");
  expect(player).toHaveTextContent("HP 35/35");
  expect(
    within(player).getByRole("progressbar", { name: "プレイヤーHP" }),
  ).toHaveAttribute("aria-valuenow", "35");
});

it("closes with Escape and reopens the same battle", async () => {
  render(
    <BattleDialog run={battle()} busy={false}>
      <button type="button">回答</button>
    </BattleDialog>,
  );
  const user = userEvent.setup();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "戦闘を開く" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("敵HP 20/20");
});

it("does not dismiss while a game save is in progress", async () => {
  render(
    <BattleDialog run={battle()} busy>
      <button type="button">回答</button>
    </BattleDialog>,
  );
  await userEvent.setup().keyboard("{Escape}");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
