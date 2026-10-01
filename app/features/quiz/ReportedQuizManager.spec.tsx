import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import ReportedQuizManager from "./ReportedQuizManager";
import { deleteQuizzes, listCreatedQuizReports } from "./api";

vi.mock("./api", () => ({
  deleteQuizzes: vi.fn(),
  listCreatedQuizReports: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(listCreatedQuizReports).mockResolvedValue([
    {
      quiz_id: "quiz-1",
      reason: "undefined",
      detail: "undefinedが含まれる",
      report_count: 2,
      resource_id: "resource-1",
      resource_name: "論理学入門",
      updated_at: "2026-10-01T00:00:00Z",
    },
  ]);
  vi.mocked(deleteQuizzes).mockResolvedValue({
    deleted_count: 1,
    deleted_answer_count: 0,
    skipped_count: 0,
  });
});

it("作成者が報告対象をまとめて削除する", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ReportedQuizManager />
    </MemoryRouter>,
  );

  expect(await screen.findByText("undefinedが含まれる")).toBeVisible();
  expect(screen.getByRole("link", { name: "論理学入門" })).toHaveAttribute(
    "href",
    "/resource/resource-1",
  );
  await user.click(screen.getByRole("checkbox", { name: "すべて選択" }));
  await user.click(screen.getByRole("button", { name: "1件を削除" }));

  expect(deleteQuizzes).toHaveBeenCalledWith(["quiz-1"]);
});
