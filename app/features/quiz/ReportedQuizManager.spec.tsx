import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import ReportedQuizManager from "./ReportedQuizManager";
import {
  type ReadableQuiz,
  deleteQuizzes,
  dismissReportedQuiz,
  listCreatedQuizReports,
} from "./api";

vi.mock("./api", () => ({
  deleteQuizzes: vi.fn(),
  dismissReportedQuiz: vi.fn(),
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
  vi.mocked(dismissReportedQuiz).mockResolvedValue();
});

it("クイズを変更せず報告だけを対応済みにする", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ReportedQuizManager />
    </MemoryRouter>,
  );

  await user.click(await screen.findByRole("button", { name: "問題なし" }));
  expect(
    screen.getByText(
      "クイズは変更・削除せず、不備報告だけを対応済みにして一覧から除外します。再び報告された場合は要対応へ戻ります。",
    ),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "対応済みにする" }));

  expect(dismissReportedQuiz).toHaveBeenCalledWith("quiz-1");
  expect(screen.queryByText("undefinedが含まれる")).not.toBeInTheDocument();
  expect(deleteQuizzes).not.toHaveBeenCalled();
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
  await user.click(screen.getByRole("button", { name: "クイズを1件削除" }));
  expect(
    screen.getByText(
      "クイズ本体と、その回答履歴・不備報告を削除します。元のResourceやTanbunは削除されません。",
    ),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "クイズを削除する" }));

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
