import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import BrokenQuizManager from "./BrokenQuizManager";
import {
  deleteQuizzes,
  listBrokenQuizReferences,
  listStudyResources,
} from "./api";

vi.mock("./api", () => ({
  deleteQuiz: vi.fn(),
  deleteQuizzes: vi.fn(),
  listBrokenQuizReferences: vi.fn(),
  listStudyResources: vi.fn(),
}));

const references = [
  {
    quiz_id: "quiz-1",
    quiz_type: "rel2pair" as const,
    retired_sentence_id: "retired-1",
    retired_value: "退役した単文",
    resource_id: "resource-1",
    roles: ["QUIZ_TARGET"],
    retired_at: "2026-09-30T00:00:00Z",
  },
  {
    quiz_id: "quiz-2",
    quiz_type: "term2sent" as const,
    retired_sentence_id: "retired-2",
    retired_value: "別の退役した単文",
    resource_id: "resource-2",
    roles: ["QUIZ_OPTION"],
    retired_at: "2026-09-29T00:00:00Z",
  },
];

beforeEach(() => {
  vi.mocked(listBrokenQuizReferences).mockResolvedValue(references);
  vi.mocked(listStudyResources).mockResolvedValue([
    { uid: "resource-1", name: "論理学ノート" },
    { uid: "resource-2", name: "TCP/IPノート" },
  ]);
  vi.mocked(deleteQuizzes).mockResolvedValue({
    deleted_count: 2,
    deleted_answer_count: 1,
    skipped_count: 0,
  });
});

it("参照切れQuizの元Resourceを表示して一括削除する", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <BrokenQuizManager />
    </MemoryRouter>,
  );

  expect(await screen.findByText("論理学ノート")).toHaveAttribute(
    "href",
    "/resource/resource-1",
  );
  expect(screen.getByText("TCP/IPノート")).toBeVisible();
  await user.click(screen.getByRole("checkbox", { name: "すべて選択" }));
  await user.click(screen.getByRole("button", { name: "2件を削除" }));
  await user.click(screen.getByRole("button", { name: "まとめて削除する" }));

  expect(deleteQuizzes).toHaveBeenCalledWith(["quiz-1", "quiz-2"]);
  expect(await screen.findByText("参照切れクイズはありません")).toBeVisible();
});
