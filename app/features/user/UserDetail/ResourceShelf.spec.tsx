import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
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
  expect(screen.getAllByRole("row")[1]).toHaveTextContent("リーダブルコード");
  expect(screen.getByRole("option", { name: "復習日順" })).toBeInTheDocument();
  expect(screen.getByTitle("復習日: 2026-10-08")).toHaveAttribute(
    "dateTime",
    "2026-10-08",
  );
  expect(
    screen.queryByText(/に成長|復習すると育ちます/),
  ).not.toBeInTheDocument();
  await user.selectOptions(
    screen.getByRole("combobox", { name: "本棚の並び順" }),
    "power",
  );
  expect(screen.getAllByRole("row")[1]).toHaveTextContent("神は数学者か？");
  await user.click(
    screen.getByRole("button", { name: "# リーダブルコードのXP内訳を見る" }),
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
  expect(screen.getAllByRole("row")).toHaveLength(2);
  expect(screen.getAllByRole("row")[1]).toHaveTextContent("論理学入門");
});

it("リソース一覧の見出し横に件数と知識量をまとめる", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ResourceShelf
        namespace={{
          ...shelfFixture,
          stats: {
            sample: {
              n_sentence: 11433,
              n_term: 4155,
              n_char: 277399,
              average_degree: 0,
              n_edge: 0,
              n_isolation: 0,
              n_axiom: 0,
              n_unrefered: 0,
              r_isolation: 0,
              r_axiom: 0,
              r_unrefered: 0,
            },
          },
        }}
        loading={false}
        own
        onRetry={vi.fn()}
      />
    </MemoryRouter>,
  );
  const heading = screen.getByRole("heading", { name: "リソース一覧 3冊" });
  const summary = within(heading.parentElement as HTMLElement);
  expect(summary.getByText("単文").nextSibling).toHaveTextContent("11,433");
  expect(summary.getByText("用語").nextSibling).toHaveTextContent("4,155");
  expect(summary.getByText("文字").nextSibling).toHaveTextContent("277,399");
  expect(screen.queryByText("Resources")).not.toBeInTheDocument();
  await user.type(screen.getByRole("textbox"), "野矢");
  expect(
    screen.getByRole("heading", { name: "リソース一覧 1 / 3冊" }),
  ).toBeVisible();
  expect(summary.getByText("11,433")).toBeVisible();
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
  expect(screen.getAllByRole("row")).toHaveLength(4);
  await user.click(
    screen.getByRole("button", { name: "# リーダブルコードのXP内訳を見る" }),
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
  expect(
    screen
      .getAllByRole("button", { name: /のXP内訳を見る/ })
      .every((button) => button.hasAttribute("disabled")),
  ).toBe(true);
  expect(screen.getAllByRole("link")).toHaveLength(3);
  expect(screen.getByRole("button", { name: "再試行" })).toBeVisible();
});

it("リソース名から詳細へ移動し、XPダイアログとは干渉しない", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ResourceShelf
              namespace={shelfFixture}
              growth={growthFixture}
              own
              loading={false}
              onRetry={vi.fn()}
            />
          }
        />
        <Route
          path="/resource/10000000-0000-0000-0000-000000000001"
          element={<p>リソース詳細</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.queryByText("読書メモを開く")).not.toBeInTheDocument();
  const link = screen.getByRole("link", {
    name: "リーダブルコード",
  });
  expect(link.closest("button")).toBeNull();
  await user.click(link);
  expect(screen.getByText("リソース詳細")).toBeVisible();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("タイトル・著者を別列で省略し、更新日と復習日を区別する", () => {
  const namespace = structuredClone(shelfFixture);
  const first = namespace.g?.nodes[0].id as unknown as {
    name: string;
    authors: string[];
    updated: string;
  };
  first.name = "# とても長いリソース名".repeat(8);
  first.authors = ["とても長い著者名".repeat(8)];
  first.updated = "2026-10-09T12:30:00Z";
  render(
    <MemoryRouter>
      <ResourceShelf
        namespace={namespace}
        growth={growthFixture}
        own
        loading={false}
        onRetry={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(
    screen.getAllByRole("columnheader").map((cell) => cell.textContent),
  ).toEqual(["Lv", "Power", "リソース", "著者", "XP", "復習日", "更新日"]);
  const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
  expect(cells[0]).toHaveTextContent("Lv. 4");
  expect(cells[0]).toHaveClass("font-semibold", "col-start-1");
  expect(cells[1]).toHaveTextContent("Power26");
  expect(cells[1]).toHaveClass("text-muted-foreground", "col-start-2");
  expect(within(cells[2]).getByRole("link")).toHaveAttribute(
    "href",
    "/resource/10000000-0000-0000-0000-000000000001",
  );
  expect(cells[3]).toHaveAttribute("title", first.authors[0]);
  const link = screen.getByRole("link", {
    name: first.name.replace(/^#+\s*/, ""),
  });
  expect(link).toHaveAttribute(
    "href",
    "/resource/10000000-0000-0000-0000-000000000001",
  );
  expect(link.querySelector("span")).toHaveClass("truncate");
  expect(screen.getByTitle(first.authors[0])).toHaveClass("truncate");
  expect(screen.getByTitle("更新日: 2026-10-09T12:30:00Z")).toHaveAttribute(
    "datetime",
    first.updated,
  );
  expect(
    screen.queryByRole("button", { name: "更新日" }),
  ).not.toBeInTheDocument();
});

it("復習日を優先し、同日は更新日降順・タイトル順で安定して並べる", () => {
  const namespace = structuredClone(shelfFixture);
  const resources = namespace.g?.nodes.map((node) => node.id) as unknown as {
    name: string;
    updated: string;
  }[];
  resources[0].name = "Old";
  resources[0].updated = "2026-10-01";
  resources[1].name = "Beta";
  resources[1].updated = "2026-10-06";
  resources[2].name = "Alpha";
  resources[2].updated = "2026-10-06";
  const growth = {
    ...growthFixture,
    resources: growthFixture.resources.map((item) => ({
      ...item,
      last_reviewed_on: "2026-10-07",
    })),
  };
  const ui = (data: typeof growth) => (
    <MemoryRouter>
      <ResourceShelf
        namespace={namespace}
        growth={data}
        own
        loading={false}
        onRetry={vi.fn()}
      />
    </MemoryRouter>
  );
  const { rerender } = render(ui(growth));
  const titles = () =>
    screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getByRole("link").textContent);
  expect(titles()).toEqual(["Alpha", "Beta", "Old"]);
  expect(screen.getAllByRole("option").map((item) => item.textContent)).toEqual(
    ["復習日順", "復習XP順", "Power順", "Lv順"],
  );
  expect(
    screen.queryByRole("button", { name: "リソース" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "著者" }),
  ).not.toBeInTheDocument();
  rerender(
    ui({
      ...growth,
      resources: growth.resources.map((item, index) => ({
        ...item,
        last_reviewed_on: index === 0 ? "2026-10-08" : item.last_reviewed_on,
      })),
    }),
  );
  expect(titles()).toEqual(["Old", "Alpha", "Beta"]);
});
