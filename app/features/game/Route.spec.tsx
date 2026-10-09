import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import DungeonRoute from "./Route";
import { enterDungeon, move, newSave, resumeEvent } from "./domain";

it("shows the entrance before moving", () => {
  const run = enterDungeon(newSave(), "book", "本", 1).run;
  if (!run) throw new Error("Missing run");
  render(<DungeonRoute run={run} knowledge={[]} onOpen={vi.fn()} />);
  expect(
    screen.getByRole("heading", { name: "現在地 · 入口" }),
  ).toBeInTheDocument();
  expect(screen.getByText("入口")).toHaveAttribute("aria-current", "step");
});

it("preserves selection order and current location across rest, and opens visited knowledge", async () => {
  let save = enterDungeon(newSave(), "book", "本", 1);
  for (const id of ["c", "a", "e", "b", "d"]) save = move(save, id, 0.9);
  save = resumeEvent(save);
  if (!save.run) throw new Error("Missing run");
  const open = vi.fn();
  render(
    <DungeonRoute
      run={save.run}
      knowledge={["a", "b", "c", "d", "e"].map((uid) => ({
        uid,
        sentence: `知識 ${uid}`,
      }))}
      onOpen={open}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "現在地 · 第5地点" }),
  ).toBeInTheDocument();
  const list = screen.getByRole("list");
  expect(
    within(list)
      .getAllByRole("listitem")
      .filter((item) => item.getAttribute("aria-current") === "step"),
  ).toHaveLength(1);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "通った2地点を表示" }));
  const buttons = within(list).getAllByRole("button");
  expect(buttons.map((button) => button.textContent)).toEqual([
    "1 · 通過知識 c",
    "2 · 通過知識 a",
    "3 · 通過知識 e",
    "4 · 通過知識 b",
    "5 · 現在地知識 d",
  ]);
  await user.click(buttons[0]);
  expect(open).toHaveBeenCalledWith("c");
});

it("keeps the location visible during combat even when old content is missing", () => {
  const run = move(
    enterDungeon(newSave(), "book", "本", 1),
    "unknown",
    0.1,
  ).run;
  if (!run) throw new Error("Missing run");
  render(<DungeonRoute run={run} knowledge={[]} onOpen={vi.fn()} />);
  expect(screen.getByText("戦闘中")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /1 · 現在地/ })).toHaveTextContent(
    "単文詳細を開く",
  );
});
