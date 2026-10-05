import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import ReportedQuizManager from "./ReportedQuizManager";
import {
  type ReadableQuiz,
  deleteQuizzes,
  listCreatedQuizReports,
} from "./api";

vi.mock("./api", () => ({
  deleteQuizzes: vi.fn(),
  listCreatedQuizReports: vi.fn(),
}));

beforeEach(() => {
  const quiz: ReadableQuiz = {
    quiz_id: "quiz-1",
    quiz_type: "term2sent",
    prompt: { subject: "構造言語学", answer_kind: "sentence" },
    statement: "構造言語学を説明する単文は？",
    options: {
      "option-1": "言語を関係の体系として捉える",
      "option-2": "語源だけを研究する",
    },
    correct: ["option-1"],
    created: "2026-10-01T00:00:00Z",
    no_correct_option: false,
  };
  vi.mocked(listCreatedQuizReports).mockResolvedValue([
    {
      quiz_id: "quiz-1",
      quiz,
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

it("報告対象の問題文・選択肢・正解を詳細表示する", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ReportedQuizManager />
    </MemoryRouter>,
  );

  await user.click(await screen.findByRole("button", { name: "詳細" }));

  const dialog = within(screen.getByRole("dialog"));
  expect(dialog.getByText("構造言語学")).toBeVisible();
  expect(dialog.getByText("言語を関係の体系として捉える")).toBeVisible();
  expect(dialog.getByText("語源だけを研究する")).toBeVisible();
  expect(dialog.getByText("正解")).toBeVisible();
  expect(dialog.getByText("undefinedが含まれる")).toBeVisible();
});
