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
  expect(screen.queryByText("持ち時間")).not.toBeInTheDocument();
  const hp = screen.getByRole("button", { name: "最大HPにポイントを割り振る" });
  await user.click(hp);
  await user.click(hp);
  await user.click(hp);
  expect(screen.getByText("50")).toBeVisible();
  expect(hp).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "振り直す" }));
  expect(
    screen.queryByLabelText("未使用の育成ポイント"),
  ).not.toBeInTheDocument();
  expect(screen.getByText("35")).toBeVisible();
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
  expect(
    screen.getByRole("button", { name: "最大HPにポイントを割り振る" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "振り直す" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "割り振りを保存" })).toBeDisabled();
});

it("spends the shared point budget on speed with the configured coefficient", async () => {
  const user = userEvent.setup();
  render(
    <StatEditor
      level={2}
      balance={{ ...defaultBalance, base_speed: 12, speed_per_point: 2 }}
      inBattle={false}
      onSaved={vi.fn()}
    />,
  );
  const speed = screen.getByRole("button", {
    name: "速さにポイントを割り振る",
  });
  await user.click(speed);
  expect(screen.getByText("14")).toBeVisible();
  await user.click(speed);
  await user.click(speed);
  expect(speed).toBeDisabled();
  expect(screen.getByText("18")).toBeVisible();
});

it("allocates the same point budget to MP and previews the admin's coefficient", async () => {
  render(
    <StatEditor
      level={2}
      balance={{ ...defaultBalance, base_mp: 12, mp_per_point: 5 }}
      inBattle={false}
      onSaved={vi.fn()}
    />,
  );
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("button", { name: "最大MPにポイントを割り振る" }),
  );
  expect(screen.getByText("17")).toBeVisible();
  expect(
    screen.queryByLabelText("未使用の育成ポイント"),
  ).not.toBeInTheDocument();
});
