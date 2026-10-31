import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { beforeEach, expect, it, vi } from "vitest";
import TravelersLibrary from "./TravelersLibrary";
import { gameRequest } from "./battle";

vi.mock("./battle", () => ({ gameRequest: vi.fn() }));
const dungeon = {
  resource_id: "guest-book",
  name: "他の人の読書メモ",
  owner_id: "owner",
  owner_name: "作成者",
  joined: false,
  key_owned: false,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(gameRequest).mockResolvedValue([dungeon]);
});
function show(
  disabled = false,
  onClaim = vi.fn().mockResolvedValue(undefined),
) {
  const onInventory = vi.fn();
  render(
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      <TravelersLibrary
        userId="guest"
        disabled={disabled}
        onClaim={onClaim}
        onInventory={onInventory}
      />
    </SWRConfig>,
  );
  return { user: userEvent.setup(), onClaim, onInventory };
}
it("searches the library and receives a key without opening a dungeon", async () => {
  const { user, onClaim, onInventory } = show();
  expect(await screen.findByText(dungeon.name)).toBeVisible();
  expect(screen.getByText("作成者の書架")).toBeVisible();
  await user.type(screen.getByLabelText("書庫を検索"), "読書");
  await user.click(screen.getByRole("button", { name: "検索" }));
  await waitFor(() =>
    expect(gameRequest).toHaveBeenLastCalledWith(
      "dungeons/public?q=%E8%AA%AD%E6%9B%B8&offset=0",
    ),
  );
  vi.mocked(gameRequest).mockResolvedValue([{ ...dungeon, key_owned: true }]);
  await user.click(screen.getByRole("button", { name: "キーを入手" }));
  expect(onClaim).toHaveBeenCalledExactlyOnceWith("guest-book");
  expect(
    await screen.findByRole("button", { name: "キー所持" }),
  ).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent(
    "開放キーを入手しました",
  );
  await user.click(screen.getByRole("button", { name: "所持品へ" }));
  expect(onInventory).toHaveBeenCalledOnce();
});
it("prevents duplicate key claims and shows previously opened dungeons", async () => {
  vi.mocked(gameRequest).mockResolvedValue([
    { ...dungeon, key_owned: true },
    { ...dungeon, resource_id: "other", name: "開放した本", joined: true },
  ]);
  show();
  expect(
    await screen.findByRole("button", { name: "キー所持" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "開放済み" })).toBeDisabled();
});
it("blocks key claims during combat", async () => {
  const { onClaim } = show(true);
  expect(
    await screen.findByRole("button", { name: "キーを入手" }),
  ).toBeDisabled();
  expect(onClaim).not.toHaveBeenCalled();
});
it("keeps failed claims retryable", async () => {
  const { user } = show(
    false,
    vi.fn().mockRejectedValue(new Error("冒険状態が更新されました")),
  );
  await user.click(await screen.findByRole("button", { name: "キーを入手" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "冒険状態が更新されました",
  );
  expect(screen.getByRole("button", { name: "キーを入手" })).toBeEnabled();
});
it("paginates and restores cached pages", async () => {
  vi.mocked(gameRequest).mockResolvedValue(
    Array.from({ length: 30 }, (_, i) => ({
      ...dungeon,
      resource_id: `book-${i}`,
      name: `本${i}`,
    })),
  );
  const { user } = show();
  await screen.findByText("本29");
  vi.mocked(gameRequest).mockResolvedValue([]);
  await user.click(screen.getByRole("button", { name: "次へ" }));
  expect(
    await screen.findByText("該当するダンジョンがありません。"),
  ).toBeVisible();
  expect(gameRequest).toHaveBeenLastCalledWith("dungeons/public?q=&offset=30");
  await user.click(screen.getByRole("button", { name: "前へ" }));
  expect(await screen.findByText("本29")).toBeVisible();
});
