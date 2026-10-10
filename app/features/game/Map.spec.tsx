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
it("retains the current region and opens the enemy list for each discovered band", async () => {
  render(
    <ExplorationMap
      map={map}
      knowledge={[]}
      onMove={vi.fn()}
      onOpen={vi.fn()}
      disabled={false}
      enemiesByRegion={{
        0: [
          {
            id: "enemy-a",
            name: "領域1の敵",
            quizIndex: 0,
            hp: 20,
            attack: 12,
          },
        ],
        1: [
          {
            id: "enemy-b",
            name: "領域2の敵",
            quizIndex: 0,
            hp: 25,
            attack: 14,
          },
        ],
      }}
    />,
  );
  expect(screen.getByRole("button", { name: /現在地 · 領域 1/ })).toBeVisible();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "領域の敵" }));
  expect(screen.getByText("領域1の敵")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "領域 2" }));
  expect(screen.getByText("領域2の敵")).toBeVisible();
  expect(screen.getByText("HP 25 · 攻 14")).toBeVisible();
  await user.keyboard("{Escape}");
  expect(
    screen.queryByRole("dialog", { name: "領域の敵一覧" }),
  ).not.toBeInTheDocument();
});
it("toggles fullscreen with f without intercepting text inputs or other dialogs", async () => {
  render(
    <>
      <input aria-label="検索" />
      <dialog open aria-label="別のダイアログ" tabIndex={-1}>
        詳細画面
      </dialog>
      <ExplorationMap
        map={map}
        knowledge={[]}
        onMove={vi.fn()}
        onOpen={vi.fn()}
        disabled={false}
      />
    </>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("textbox", { name: "検索" }));
  await user.keyboard("f");
  expect(screen.getByRole("textbox", { name: "検索" })).toHaveValue("f");
  expect(
    screen.queryByRole("dialog", { name: "冒険マップ" }),
  ).not.toBeInTheDocument();
  screen.getByRole("dialog", { name: "別のダイアログ" }).focus();
  await user.keyboard("f");
  expect(
    screen.queryByRole("dialog", { name: "冒険マップ" }),
  ).not.toBeInTheDocument();
  screen.getByLabelText("探索マップをスクロール").focus();
  await user.keyboard("f");
  expect(screen.getByRole("dialog", { name: "冒険マップ" })).toBeVisible();
  await user.keyboard("f");
  expect(
    screen.queryByRole("dialog", { name: "冒険マップ" }),
  ).not.toBeInTheDocument();
});

it("separates the dungeon header and player HUD, and offers non-adjacent known travel", async () => {
  const onMove = vi.fn();
  render(
    <ExplorationMap
      map={map}
      knowledge={[]}
      title="本のダンジョン"
      remainingMoves={3}
      status={<span>撃破 1/3</span>}
      playerStatus={<span>HP 20/35</span>}
      onMove={onMove}
      onOpen={vi.fn()}
      disabled={false}
    />,
  );
  const header = screen.getByLabelText("ダンジョン情報");
  expect(header).toHaveTextContent("本のダンジョン");
  expect(header).not.toHaveTextContent("撃破");
  expect(header).not.toContainElement(screen.getByLabelText("残り移動数"));
  expect(screen.getByLabelText("残り移動数")).toHaveTextContent("3歩");
  expect(header).not.toHaveTextContent("HP");
  expect(screen.getByLabelText("プレイヤー情報")).toHaveTextContent("HP 20/35");
  expect(screen.getByLabelText("プレイヤー情報")).toHaveClass(
    "left-3",
    "top-16",
  );
  expect(header).not.toHaveTextContent("現在地");
  expect(header).not.toHaveTextContent("開拓");
  expect(screen.getByLabelText("冒険の進行状況")).toHaveTextContent(
    "現在地 · 第2地点",
  );
  expect(screen.getByLabelText("冒険の進行状況")).toHaveTextContent(
    "開拓 2地点",
  );
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: /入口\s*入口/ }));
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "入口へ移動" }));
  expect(onMove).toHaveBeenCalledWith("@entrance", undefined);
});
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
it("marks current location and offers one-step travel to known places", async () => {
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
