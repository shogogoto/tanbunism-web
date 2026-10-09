import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ExplorationMap from "./Map";
import { type DungeonMap, ENTRANCE } from "./exploration";

const map: DungeonMap = {
  current: "b",
  places: [
    { id: "a", region: 0 },
    { id: "b", region: 0 },
  ],
  edges: [
    { from: ENTRANCE, to: "a", kind: "detour" },
    { from: "a", to: "b", kind: "relation" },
  ],
};
it("uses arrows to focus places, Enter to open/confirm, and Escape to return without travel", async () => {
  const onMove = vi.fn();
  render(
    <ExplorationMap
      map={map}
      knowledge={[
        { uid: "a", sentence: "知識A" },
        { uid: "b", sentence: "知識B" },
      ]}
      candidates={[
        { knowledge: { uid: "c", sentence: "知識C" }, kind: "relation" },
      ]}
      onMove={onMove}
      onOpen={vi.fn()}
      disabled={false}
    />,
  );
  const user = userEvent.setup();
  screen.getByLabelText("探索マップをスクロール").focus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("button", { name: /未探索.*知識C/ })).toHaveFocus();
  expect(screen.queryByLabelText("選択した地点")).not.toBeInTheDocument();
  await user.keyboard("{Enter}");
  await vi.waitFor(() =>
    expect(
      screen.getByRole("button", { name: "見たよ · この道へ" }),
    ).toHaveFocus(),
  );
  expect(onMove).not.toHaveBeenCalled();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button", { name: /未探索.*知識C/ })).toHaveFocus();
  expect(screen.queryByLabelText("選択した地点")).not.toBeInTheDocument();
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByRole("button", { name: /現在地.*知識B/ })).toHaveFocus();
  await user.keyboard("{ArrowLeft}{Enter}");
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "知識Aへ移動" })).toHaveFocus(),
  );
  await user.keyboard("{Enter}");
  expect(onMove).toHaveBeenCalledWith("a", undefined);
});

it("keeps fullscreen open when Escape dismisses a selection and prevents keyboard travel while disabled", async () => {
  const onMove = vi.fn();
  render(
    <ExplorationMap
      map={map}
      knowledge={[{ uid: "a", sentence: "知識A" }]}
      onMove={onMove}
      onOpen={vi.fn()}
      disabled
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "マップを全画面表示" }));
  await vi.waitFor(() =>
    expect(screen.getByLabelText("探索マップをスクロール")).toHaveFocus(),
  );
  await user.keyboard("{ArrowLeft}{Enter}");
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "詳細" })).toHaveFocus(),
  );
  expect(
    screen.queryByRole("button", { name: "知識Aへ移動" }),
  ).not.toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog", { name: "冒険マップ" })).toBeVisible();
  expect(onMove).not.toHaveBeenCalled();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("marks current location and offers only adjacent places for one-step travel", async () => {
  const onMove = vi.fn();
  const onOpen = vi.fn();
  render(
    <ExplorationMap
      map={map}
      knowledge={[
        { uid: "a", sentence: "知識A", term: { names: ["用語A"] } },
        { uid: "b", sentence: "知識B" },
      ]}
      onMove={onMove}
      onOpen={onOpen}
      disabled={false}
    />,
  );
  expect(screen.getByRole("button", { name: /現在地.*知識B/ })).toHaveAttribute(
    "aria-current",
    "location",
  );
  expect(
    screen.queryByRole("button", { name: "入口へ移動" }),
  ).not.toBeInTheDocument();
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: /領域 1.*用語A/ }));
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "用語Aへ移動" }));
  expect(onMove).toHaveBeenCalledWith("a", undefined);
  await userEvent.setup().click(screen.getByRole("button", { name: "詳細" }));
  expect(onOpen).toHaveBeenCalledWith("a");
});
it("shows unexplored candidates on the map and moves only after confirmation", async () => {
  const onMove = vi.fn();
  render(
    <ExplorationMap
      map={map}
      knowledge={[]}
      candidates={[
        {
          knowledge: {
            uid: "c",
            sentence: "新しい単文",
            term: { names: ["用語C"] },
          },
          kind: "relation",
        },
      ]}
      onMove={onMove}
      onOpen={vi.fn()}
      disabled={false}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /未探索.*用語C/ }));
  expect(onMove).not.toHaveBeenCalled();
  expect(screen.getByText("新しい単文")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "見たよ · この道へ" }));
  expect(onMove).toHaveBeenCalledWith("c", "relation");
});
it("enters app fullscreen, supports Escape, and restores focus without moving", async () => {
  const onMove = vi.fn();
  render(
    <ExplorationMap
      map={map}
      knowledge={[]}
      onMove={onMove}
      onOpen={vi.fn()}
      disabled={false}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "マップを全画面表示" }));
  expect(screen.getByRole("dialog", { name: "冒険マップ" })).toBeVisible();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await vi.waitFor(() =>
    expect(
      screen.getByRole("button", { name: "マップを全画面表示" }),
    ).toHaveFocus(),
  );
  expect(onMove).not.toHaveBeenCalled();
});
it("allows previews but not movement while combat or rest disables travel", () => {
  render(
    <ExplorationMap
      map={map}
      knowledge={[]}
      onMove={vi.fn()}
      onOpen={vi.fn()}
      disabled
    />,
  );
  expect(
    screen.queryByRole("button", { name: /へ移動/ }),
  ).not.toBeInTheDocument();
});
it("requests browser fullscreen and retains the app fallback when permission is denied", async () => {
  const request = vi.fn().mockRejectedValue(new Error("Unsupported"));
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    configurable: true,
    value: request,
  });
  try {
    render(
      <ExplorationMap
        map={map}
        knowledge={[]}
        onMove={vi.fn()}
        onOpen={vi.fn()}
        disabled={false}
      />,
    );
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "マップを全画面表示" }),
    );
    expect(request).toHaveBeenCalledWith({ navigationUI: "hide" });
    expect(screen.getByRole("dialog", { name: "冒険マップ" })).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  } finally {
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");
  }
});
