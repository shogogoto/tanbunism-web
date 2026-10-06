import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import ResourceShelf from "./ResourceShelf";
import { growthFixture, shelfFixture } from "./ResourceShelf.fixture";

it("所有本を成長順に並べ、内訳を開き、著者で絞れる", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ResourceShelf
        namespace={shelfFixture}
        growth={growthFixture}
        own
        loading={false}
        onRetry={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("article")[0]).toHaveTextContent(
    "リーダブルコード",
  );
  await user.selectOptions(
    screen.getByRole("combobox", { name: "本棚の並び順" }),
    "power",
  );
  expect(screen.getAllByRole("article")[0]).toHaveTextContent("神は数学者か？");
  await user.click(
    screen.getByRole("button", { name: "# リーダブルコードの成長を見る" }),
  );
  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText("累計 80 XP")).toBeVisible();
  expect(dialog.getByText("+50 XP")).toBeVisible();
  expect(dialog.getByText("論理 10 ＋ 参照 16")).toBeVisible();
  expect(dialog.getByText("順番を一貫させる")).toBeVisible();
  await user.keyboard("{Escape}");
  await user.type(
    screen.getByRole("textbox", { name: "本棚を絞り込む" }),
    "野矢",
  );
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.getByRole("article")).toHaveTextContent("論理学入門");
});

it("公開本棚には本人向けの活動ログや他人の本を載せない", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ResourceShelf
        namespace={shelfFixture}
        growth={{
          ...growthFixture,
          resources: [
            ...growthFixture.resources,
            {
              ...growthFixture.resources[0],
              resource_id: "foreign",
              resource_name: "他人の本",
            },
          ],
        }}
        own={false}
        loading={false}
        onRetry={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("article")).toHaveLength(3);
  await user.click(
    screen.getByRole("button", { name: "# リーダブルコードの成長を見る" }),
  );
  expect(screen.queryByText("順番を一貫させる")).not.toBeInTheDocument();
  expect(screen.queryByText("最近の成長")).not.toBeInTheDocument();
});

it("集計が未取得ならLv1やPower0を捏造せず本のリンクを残す", () => {
  render(
    <MemoryRouter>
      <ResourceShelf
        namespace={shelfFixture}
        own
        loading={false}
        error={new Error("failed")}
        onRetry={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(screen.getAllByText("Lv. —")).toHaveLength(3);
  expect(screen.queryByText("Lv. 1")).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "読書メモを開く" })).toHaveLength(
    3,
  );
  expect(screen.getByRole("button", { name: "再試行" })).toBeVisible();
});
