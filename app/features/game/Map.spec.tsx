import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import ExplorationMap from "./Map";
import { type DungeonMap, ENTRANCE } from "./exploration";

it("places unlocked bosses after their milestone, separates chests and supports keyboard challenges", async () => {
  const user = userEvent.setup();
  const fight = vi.fn();
  const places = Array.from({ length: 25 }, (_, i) => ({
    id: `p${i}`,
    region: Math.floor(i / 5),
  }));
  const props = {
    map: { current: "p24", places, edges: [] },
    knowledge: places.map((p) => ({ uid: p.id, sentence: p.id })),
    onMove: vi.fn(),
    onOpen: vi.fn(),
    disabled: false,
    onBoss: fight,
    canChallengeBoss: () => true,
  };
  const view = render(
    <ExplorationMap
      {...props}
      map={{ ...props.map, current: "p23", places: places.slice(0, 24) }}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "達成度 5のボス" }),
  ).not.toBeInTheDocument();
  view.rerender(<ExplorationMap {...props} />);
  const boss = screen.getByRole("button", { name: "達成度 5のボス" });
  const last = screen.getByRole("button", { name: /現在地 · 領域 5p24/ });
  const chest = screen.getByRole("button", { name: "領域 5の宝箱" });
  expect(boss.style.top).toBe(last.style.top);
  expect(Number.parseFloat(boss.style.left)).toBe(
    Number.parseFloat(last.style.left) + 230,
  );
  expect(Number.parseFloat(chest.style.left)).toBeGreaterThan(
    Number.parseFloat(boss.style.left),
  );
  expect(
    screen.queryByRole("button", { name: "達成度 10のボス" }),
  ).not.toBeInTheDocument();
  await user.click(last);
  await user.keyboard("{ArrowRight}");
  expect(boss).toHaveFocus();
  expect(
    screen.queryByRole("button", { name: "詳細" }),
  ).not.toBeInTheDocument();
  await user.keyboard("{Enter}");
  expect(fight).toHaveBeenCalledExactlyOnceWith(5);
  view.rerender(<ExplorationMap {...props} bossClears={[5]} />);
  expect(
    screen.getByRole("button", { name: "達成度 5のボス（撃破済み）" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "再挑戦 · 1歩" })).toBeEnabled();
});

it("disables map boss challenges away from the milestone and without battle eligibility", async () => {
  const user = userEvent.setup();
  const places = Array.from({ length: 25 }, (_, i) => ({
    id: `p${i}`,
    region: Math.floor(i / 5),
  }));
  const props = {
    map: { current: ENTRANCE, places, edges: [] },
    knowledge: [],
    onMove: vi.fn(),
    onOpen: vi.fn(),
    onBoss: vi.fn(),
    canChallengeBoss: () => true,
    disabled: false,
  };
  const view = render(<ExplorationMap {...props} />);
  await user.click(screen.getByRole("button", { name: "達成度 5のボス" }));
  expect(
    screen.getByRole("button", { name: "ボスに挑戦 · 1歩" }),
  ).toBeDisabled();
  view.rerender(
    <ExplorationMap
      {...props}
      map={{ ...props.map, current: "p24" }}
      canChallengeBoss={() => false}
    />,
  );
  await user.click(screen.getByRole("button", { name: "達成度 5のボス" }));
  expect(
    screen.getByRole("button", { name: "ボスに挑戦 · 1歩" }),
  ).toBeDisabled();
  expect(props.onBoss).not.toHaveBeenCalled();
});

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

it("opens a completed region's chest with the keyboard and keeps its contents visible after opening", async () => {
  const user = userEvent.setup();
  const onMove = vi.fn();
  const places = Array.from({ length: 6 }, (_, i) => ({
    id: `p${i}`,
    region: Math.floor(i / 5),
  }));
  const completed: DungeonMap = { current: "p4", places, edges: [] };
  const props = {
    map: completed,
    knowledge: places.map((p) => ({ uid: p.id, sentence: p.id })),
    onMove,
    onOpen: vi.fn(),
    disabled: false,
    exhaustedMessage: <p>復習して歩数を回復</p>,
  };
  const view = render(<ExplorationMap {...props} />);
  expect(
    screen.queryByRole("button", { name: "領域 2の宝箱" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /現在地 · 領域 1p4/ }));
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("button", { name: "領域 1の宝箱" })).toHaveFocus();
  expect(screen.getByRole("button", { name: "宝箱へ移動" })).toBeVisible();
  await user.keyboard("{Enter}");
  expect(onMove).toHaveBeenCalledWith("@chest:0");
  view.rerender(
    <ExplorationMap
      {...props}
      map={{ ...completed, current: "@chest:0" }}
      openedChests={{ "0": { gold: 30, healing_potion: 0, step_potion: 1 } }}
    />,
  );
  expect(
    screen.getByRole("button", { name: "領域 1の宝箱（開封済み）" }),
  ).toHaveAttribute("aria-current", "location");
  expect(screen.getByText("30 G、歩数回復薬 ×1 が入っていた。")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "詳細" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("現在地 · 領域 1の宝箱")).toBeVisible();
});

it("aligns each region in a horizontal row even when old edges branch", () => {
  const places = Array.from({ length: 7 }, (_, i) => ({
    id: `place-${i}`,
    region: Math.floor(i / 5),
  }));
  render(
    <ExplorationMap
      map={{
        current: "place-0",
        places,
        edges: places.map((p) => ({
          from: ENTRANCE,
          to: p.id,
          kind: "detour",
        })),
      }}
      knowledge={places.map((p) => ({ uid: p.id, sentence: p.id }))}
      onOpen={vi.fn()}
      onMove={vi.fn()}
      disabled={false}
    />,
  );
  const nodes = places.map((p) =>
    screen.getByRole("button", { name: new RegExp(`${p.id}$`) }),
  );
  expect(nodes[0].style.top).toBe(nodes[4].style.top);
  expect(nodes[5].style.top).toBe(nodes[6].style.top);
  expect(nodes[5].style.top).not.toBe(nodes[0].style.top);
  expect(nodes[0].style.left).toBe(nodes[5].style.left);
  expect(Number.parseFloat(nodes[4].style.left)).toBeGreaterThan(
    Number.parseFloat(nodes[0].style.left),
  );
});

it("shows other dungeons and recovery at the entrance and navigates them", async () => {
  const travel = vi.fn();
  render(
    <ExplorationMap
      map={{ ...map, current: ENTRANCE }}
      knowledge={[]}
      dungeonId="book"
      dungeons={[{ id: "other", name: "別の本" }]}
      onDungeon={travel}
      onMove={vi.fn()}
      onOpen={vi.fn()}
      disabled={false}
    />,
  );
  const entrance = screen.getByRole("button", {
    name: /現在地 · 入口入口$/,
  });
  const other = screen.getByRole("button", { name: "ダンジョン 別の本" });
  expect(Number.parseFloat(other.style.left)).toBeLessThan(
    Number.parseFloat(entrance.style.left),
  );
  const user = userEvent.setup();
  await user.click(entrance);
  await user.keyboard("{ArrowLeft}");
  expect(other).toHaveFocus();
  await user.keyboard("{Enter}");
  await user.click(
    screen.getByRole("button", { name: "このダンジョンへ移動" }),
  );
  expect(travel).toHaveBeenCalledWith("other");
});

it("hides other dungeons and recovery while away from the entrance", () => {
  render(
    <ExplorationMap
      map={map}
      knowledge={[]}
      dungeonId="book"
      dungeons={[{ id: "other", name: "別の本" }]}
      onDungeon={vi.fn()}
      onMove={vi.fn()}
      onOpen={vi.fn()}
      disabled={false}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "ダンジョン 別の本" }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "回復場所" })).toBeNull();
});

it("does not show a persistent keyboard instruction on the map", () => {
  render(
    <ExplorationMap
      map={map}
      knowledge={[]}
      onMove={vi.fn()}
      onOpen={vi.fn()}
      disabled={false}
    />,
  );
  expect(screen.queryByText(/実線：知識の関係/)).toBeNull();
});

it("allows restarting from the entrance node itself when defeated there", async () => {
  const restart = vi.fn();
  render(
    <ExplorationMap
      map={{ current: ENTRANCE, places: [], edges: [] }}
      knowledge={[]}
      onMove={vi.fn()}
      onOpen={vi.fn()}
      onRestart={restart}
      disabled={false}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /現在地 · 入口/ }));
  await user.click(screen.getByRole("button", { name: "冒険を再開" }));
  expect(restart).toHaveBeenCalledOnce();
});
it("shows the frontier region even when opening a new path from an older region", async () => {
  const knowledge = { uid: "new", sentence: "次の道" };
  render(
    <ExplorationMap
      map={{
        current: "p0",
        places: Array.from({ length: 15 }, (_, index) => ({
          id: `p${index}`,
          region: Math.floor(index / 5),
        })),
        edges: [],
      }}
      knowledge={[]}
      candidates={[{ knowledge, kind: "detour" }]}
      onMove={vi.fn()}
      onOpen={vi.fn()}
      disabled={false}
    />,
  );
  expect(screen.getByRole("button", { name: /現在地 · 領域 1/ })).toBeVisible();
  const next = screen.getByRole("button", { name: /未探索 · 領域 4/ });
  await userEvent.setup().click(next);
  expect(
    screen.getByRole("region", { name: "選択した地点" }),
  ).toHaveTextContent("未探索 · 領域 4");
});
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
            speed: 17,
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
  expect(screen.getByText("HP 25 · 攻 14 · 速さ 17")).toBeVisible();
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
it("previews places on arrow focus, travels with one Enter, and dismisses with Escape", async () => {
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
  expect(screen.getByLabelText("選択した地点")).toHaveTextContent("知識C");
  await user.keyboard("{Enter}");
  expect(onMove).toHaveBeenCalledOnce();
  expect(onMove).toHaveBeenCalledWith("c", "relation");
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button", { name: /未探索.*知識C/ })).toHaveFocus();
  expect(screen.queryByLabelText("選択した地点")).not.toBeInTheDocument();
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByRole("button", { name: /現在地.*知識B/ })).toHaveFocus();
  await user.keyboard("{ArrowLeft}{Enter}");
  expect(onMove).toHaveBeenCalledTimes(2);
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
  await user.click(screen.getByRole("button", { name: "進む" }));
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
  expect(screen.getByRole("dialog", { name: "冒険マップ" })).toBeVisible();
  expect(screen.queryByLabelText("選択した地点")).not.toBeInTheDocument();
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
    expect(screen.queryByLabelText("選択した地点")).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  } finally {
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");
  }
});
