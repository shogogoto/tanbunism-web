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
  expect(screen.getAllByRole("article")[0]).toHaveTextContent(
    "リーダブルコード",
  );
  expect(screen.getByRole("option", { name: "復習日順" })).toBeInTheDocument();
  expect(screen.getByText("2026-10-08")).toHaveAttribute(
    "dateTime",
    "2026-10-08",
  );
  expect(screen.getByText("2026-10-08")).toHaveAttribute("title", "最終復習日");
  expect(
    screen.queryByText(/に成長|復習すると育ちます/),
  ).not.toBeInTheDocument();
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
  expect(
    screen.getAllByRole("link", { name: /の読書メモを開く/ }),
  ).toHaveLength(3);
  expect(screen.getByRole("button", { name: "再試行" })).toBeVisible();
});

it("本アイコンから詳細へ移動し、成長ダイアログとは干渉しない", async () => {
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
    name: "# リーダブルコードの読書メモを開く",
  });
  expect(link.closest("button")).toBeNull();
  await user.click(link);
  expect(screen.getByText("リソース詳細")).toBeVisible();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
