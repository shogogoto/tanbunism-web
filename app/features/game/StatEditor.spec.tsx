import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import StatEditor from "./StatEditor";
import { defaultBalance } from "./battle";

it("previews allocation, enforces the total budget, and resets freely", async () => {
  const user = userEvent.setup();
  render(
    <StatEditor
      level={2}
      balance={defaultBalance}
      inBattle={false}
      onSaved={vi.fn()}
    />,
  );
  const hp = screen.getByRole("spinbutton", { name: "HP" });
  await user.clear(hp);
  await user.type(hp, "3");
  expect(screen.getByText("育成ポイント 0 / 3")).toBeVisible();
  expect(screen.getByText(/HP 50/)).toBeVisible();
  const attack = screen.getByRole("spinbutton", { name: "攻" });
  await user.clear(attack);
  await user.type(attack, "1");
  expect(screen.getByRole("button", { name: "割り振りを保存" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "リセット" }));
  expect(hp).toHaveValue(0);
  expect(attack).toHaveValue(0);
  expect(screen.getByText("育成ポイント 3 / 3")).toBeVisible();
});

it("blocks allocation and reset during battle", () => {
  render(
    <StatEditor
      level={4}
      balance={defaultBalance}
      inBattle
      onSaved={vi.fn()}
    />,
  );
  expect(screen.getByRole("spinbutton", { name: "HP" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "リセット" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "割り振りを保存" })).toBeDisabled();
});
