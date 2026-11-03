import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EnemyAvatar from "./EnemyAvatar";
import GameIcon, { IconPicker } from "./GameIcon";
import { characterAsset, characterAssets } from "./characterAssets";
import { iconFilterKey, recentIconKey } from "./iconPickerPreferences";

afterEach(() => {
  sessionStorage.removeItem(iconFilterKey);
  localStorage.removeItem(recentIconKey);
});

it("ships a real PNG or WebP for every registered artwork", () => {
  for (const asset of Object.values(characterAssets)) {
    const bytes = readFileSync(resolve("public", asset.src.slice(1)));
    if (asset.src.endsWith(".png")) {
      expect([...bytes.subarray(0, 8)]).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(bytes.readUInt32BE(16)).toBe(32);
      expect(bytes.readUInt32BE(20)).toBe(32);
    } else {
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
    }
  }
  expect(characterAsset("https://example.com/other.png")).toBeUndefined();
  expect(characterAsset("constructor")).toBeUndefined();
});

it("keeps pixel artwork crisp instead of smoothing it when enlarged", () => {
  const { container } = render(
    <GameIcon icon="crawl_dragon" className="size-40" />,
  );
  expect(container.querySelector("img")).toHaveStyle({
    imageRendering: "pixelated",
  });
});

it("filters artwork by both purpose and style, and selects an item by keyboard", async () => {
  const onChange = vi.fn();
  render(<IconPicker value="flask" onChange={onChange} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "素材を選ぶ" }));
  const dialog = screen.getByRole("dialog", { name: "ゲーム素材一覧" });
  await user.click(within(dialog).getByRole("button", { name: "ドット絵" }));
  await user.click(
    within(dialog).getByRole("button", { name: "道具・食べ物" }),
  );
  expect(
    within(dialog).queryByRole("button", { name: "ドラゴン" }),
  ).not.toBeInTheDocument();
  expect(
    within(dialog).queryByRole("button", { name: "水晶竜" }),
  ).not.toBeInTheDocument();
  await user.type(
    within(dialog).getByRole("textbox", { name: "素材を検索" }),
    "赤い薬",
  );
  const potion = within(dialog).getByRole("button", { name: "赤い薬" });
  potion.focus();
  await user.keyboard("{Enter}");
  expect(onChange).toHaveBeenCalledExactlyOnceWith("crawl_red_potion");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("renders boss artwork at a larger size instead of a vector icon", () => {
  const { container } = render(
    <EnemyAvatar identity="boss:5" icon="art_archive_golem" large />,
  );
  expect(container.querySelector("img")).toHaveAttribute(
    "src",
    "/game-assets/archive_golem.webp",
  );
  expect(container.firstElementChild).toHaveClass("size-40");
  expect(container.querySelector("svg")).not.toBeInTheDocument();
});

it("shares filters and recent equipment choices across already-mounted pickers and remounts", async () => {
  const user = userEvent.setup();
  const first = vi.fn();
  const second = vi.fn();
  const view = render(
    <>
      <IconPicker label="一つ目の素材" value="flask" onChange={first} />
      <IconPicker label="二つ目の素材" value="flask" onChange={second} />
    </>,
  );
  await user.click(screen.getByRole("button", { name: "一つ目の素材を選ぶ" }));
  await user.click(screen.getByRole("button", { name: "装備" }));
  await user.click(screen.getByRole("button", { name: "ドット絵" }));
  await user.type(screen.getByLabelText("素材を検索"), "足");
  expect(screen.getByRole("button", { name: "革のブーツ" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "革の鎧" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "革のブーツ" }));
  expect(first).toHaveBeenCalledWith("crawl_leather_boots");
  await user.click(screen.getByRole("button", { name: "二つ目の素材を選ぶ" }));
  expect(screen.getByLabelText("素材を検索")).toHaveValue("足");
  expect(screen.getByRole("button", { name: "装備" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await user.click(
    within(screen.getByRole("region", { name: "最近使った素材" })).getByRole(
      "button",
      { name: "最近使った革のブーツを選ぶ" },
    ),
  );
  expect(second).toHaveBeenCalledWith("crawl_leather_boots");
  view.unmount();
  render(<IconPicker value="shield" onChange={second} />);
  await user.click(screen.getByRole("button", { name: "素材を選ぶ" }));
  expect(screen.getByLabelText("素材を検索")).toHaveValue("足");
  expect(
    screen.getByRole("button", { name: "最近使った革のブーツを選ぶ" }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "絞り込みをリセット" }));
  expect(screen.getByLabelText("素材を検索")).toHaveValue("");
  expect(screen.getByRole("button", { name: "面頬付きの兜" })).toBeVisible();
});
