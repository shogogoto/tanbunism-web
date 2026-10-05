import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import OrphanedTanbunManager from ".";
import {
  type OrphanedTanbun,
  deleteOrphanedTanbuns,
  listOrphanedTanbuns,
} from "./api";

vi.mock("./api", () => ({
  listOrphanedTanbuns: vi.fn(),
  deleteOrphanedTanbuns: vi.fn(),
}));

const orphan: OrphanedTanbun = {
  uid: "orphan-1",
  sentence: "配置を失った単文",
  resource_uid: "resource-1",
  resource_name: "古い読書メモ",
  owner_email: "owner@example.com",
  reason: "missing_location",
  quiz_reference_count: 1,
  answer_reference_count: 2,
  relationship_count: 4,
};

beforeEach(() => {
  vi.mocked(listOrphanedTanbuns).mockResolvedValue([orphan]);
  vi.mocked(deleteOrphanedTanbuns).mockResolvedValue({
    deleted_count: 0,
    retired_count: 1,
    skipped_count: 0,
  });
});

it("配置切れ理由と保護対象の参照数を一覧できる", async () => {
  render(
    <MemoryRouter>
      <OrphanedTanbunManager kind="misplaced" />
    </MemoryRouter>,
  );

  expect(await screen.findByText("配置を失った単文")).toBeInTheDocument();
  expect(screen.getByText("古い読書メモ")).toBeInTheDocument();
  expect(screen.getByText("配置なし")).toBeInTheDocument();
  expect(screen.getByText("Quiz 1")).toBeInTheDocument();
  expect(screen.getByText("回答 2")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /古い読書メモ/ })).toHaveAttribute(
    "href",
    "/resource/resource-1?inspect=orphan-1#orphan-1",
  );
  expect(listOrphanedTanbuns).toHaveBeenCalledWith("misplaced");
});

it("選択した孤立単文を確認後に掃除して再検出する", async () => {
  const user = userEvent.setup();
  vi.mocked(listOrphanedTanbuns)
    .mockResolvedValueOnce([orphan])
    .mockResolvedValueOnce([]);
  render(
    <MemoryRouter>
      <OrphanedTanbunManager kind="misplaced" />
    </MemoryRouter>,
  );

  await user.click(
    await screen.findByRole("checkbox", { name: /配置を失った単文/ }),
  );
  await user.click(screen.getByRole("button", { name: "選択した項目を掃除" }));
  expect(screen.getByText(/復旧できるよう退役Tanbun/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "掃除する" }));

  await waitFor(() =>
    expect(deleteOrphanedTanbuns).toHaveBeenCalledWith(
      ["orphan-1"],
      "misplaced",
    ),
  );
  expect(await screen.findByText("配置切れTanbunはありません")).toBeVisible();
});
