import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { UserReadPublic } from "~/shared/generated/fastAPI.schemas";
import BattleDialog from "./BattleDialog";
import PlayerStatus from "./PlayerStatus";
import { enterDungeon, move, newSave } from "./domain";

vi.mock("~/features/user/UserAvatar", () => ({
  default: ({ user }: { user?: UserReadPublic }) => (
    <img
      src={user?.avatar_url ?? undefined}
      alt={user?.display_name ?? "あなた"}
    />
  ),
}));

const player: UserReadPublic = {
  uid: "player",
  created: "2026-10-09",
  display_name: "テストプレイヤー",
  avatar_url: "https://example.com/profile.png",
};
const run = move(enterDungeon(newSave(), "book", "本", 1), "sentence", 0.1).run;
if (!run) throw new Error("Missing run");

it("uses the shared profile avatar and follows profile replacements", () => {
  const view = render(
    <PlayerStatus
      run={run}
      player={player}
      name={player.display_name ?? undefined}
    />,
  );
  expect(screen.getByRole("img")).toHaveAttribute("src", player.avatar_url);
  view.rerender(
    <PlayerStatus
      run={run}
      player={{ ...player, avatar_url: "https://example.com/new.png" }}
    />,
  );
  expect(screen.getByRole("img")).toHaveAttribute(
    "src",
    "https://example.com/new.png",
  );
});

it("uses the same profile avatar in battle", () => {
  render(
    <BattleDialog
      run={run}
      player={player}
      playerName="テストプレイヤー"
      busy={false}
    >
      <p>問題</p>
    </BattleDialog>,
  );
  expect(screen.getByRole("img", { name: "テストプレイヤー" })).toHaveAttribute(
    "src",
    player.avatar_url,
  );
});
