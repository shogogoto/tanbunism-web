import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { beforeEach, expect, it, vi } from "vitest";
import PublicDungeons from "./PublicDungeons";
import { gameRequest } from "./battle";

vi.mock("./battle", () => ({ gameRequest: vi.fn() }));
const dungeon = {
  resource_id: "guest-book",
  name: "他の人の読書メモ",
  owner_id: "owner",
  owner_name: "作成者",
  joined: false,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(gameRequest).mockResolvedValue([dungeon]);
});

function show(disabled = false, onJoin = vi.fn().mockResolvedValue(undefined)) {
  render(
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      <PublicDungeons userId="guest" disabled={disabled} onJoin={onJoin} />
    </SWRConfig>,
  );
  return { onJoin, user: userEvent.setup() };
}

it("loads only when opened, searches, and adds a dungeon", async () => {
  const { user, onJoin } = show();
  expect(gameRequest).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "他ユーザーのダンジョン" }),
  );
  expect(await screen.findByText(dungeon.name)).toBeVisible();
  expect(screen.getByText("作成者")).toBeVisible();
  await user.type(screen.getByLabelText("公開ダンジョンを検索"), "読書");
  await user.click(screen.getByRole("button", { name: "検索" }));
  await waitFor(() =>
    expect(gameRequest).toHaveBeenLastCalledWith(
      "dungeons/public?q=%E8%AA%AD%E6%9B%B8&offset=0",
    ),
  );
  vi.mocked(gameRequest).mockResolvedValue([{ ...dungeon, joined: true }]);
  await user.click(screen.getByRole("button", { name: "追加" }));
  expect(onJoin).toHaveBeenCalledExactlyOnceWith("guest-book");
  expect(
    await screen.findByRole("button", { name: "追加済み" }),
  ).toBeDisabled();
});

it("prevents additions during battle or another save", async () => {
  const { user, onJoin } = show(true);
  await user.click(
    screen.getByRole("button", { name: "他ユーザーのダンジョン" }),
  );
  expect(await screen.findByRole("button", { name: "追加" })).toBeDisabled();
  expect(onJoin).not.toHaveBeenCalled();
});

it("keeps a failed addition retryable", async () => {
  const { user } = show(
    false,
    vi.fn().mockRejectedValue(new Error("冒険状態が更新されました")),
  );
  await user.click(
    screen.getByRole("button", { name: "他ユーザーのダンジョン" }),
  );
  await user.click(await screen.findByRole("button", { name: "追加" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "冒険状態が更新されました",
  );
  expect(screen.getByRole("button", { name: "追加" })).toBeEnabled();
});

it("paginates the public shelf", async () => {
  vi.mocked(gameRequest).mockResolvedValue(
    Array.from({ length: 30 }, (_, i) => ({
      ...dungeon,
      resource_id: `book-${i}`,
      name: `本${i}`,
    })),
  );
  const { user } = show();
  await user.click(
    screen.getByRole("button", { name: "他ユーザーのダンジョン" }),
  );
  await screen.findByText("本29");
  vi.mocked(gameRequest).mockResolvedValue([]);
  await user.click(screen.getByRole("button", { name: "次へ" }));
  expect(
    await screen.findByText("該当するダンジョンがありません。"),
  ).toBeVisible();
  expect(gameRequest).toHaveBeenLastCalledWith("dungeons/public?q=&offset=30");
  await user.click(screen.getByRole("button", { name: "前へ" }));
  expect(await screen.findByText("本29")).toBeVisible();
  expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
});
