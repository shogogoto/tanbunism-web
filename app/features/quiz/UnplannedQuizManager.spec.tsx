import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import UnplannedQuizManager from "./UnplannedQuizManager";
import { deleteQuizzes, listUnplannedQuizzes } from "./api";

vi.mock("./api", () => ({
  deleteQuizzes: vi.fn(),
  listUnplannedQuizzes: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(listUnplannedQuizzes).mockResolvedValue([
    {
      quiz_id: "quiz-1",
      quiz_type: "sent2term",
      resource_id: "resource-1",
      resource_name: "TCP/IPノート",
    },
  ]);
  vi.mocked(deleteQuizzes).mockResolvedValue({
    deleted_count: 1,
    deleted_answer_count: 0,
    skipped_count: 0,
  });
});

it("StudyPlan未所属QuizをResource付きで表示して一括削除する", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <UnplannedQuizManager />
    </MemoryRouter>,
  );

  expect(await screen.findByText("TCP/IPノート")).toHaveAttribute(
    "href",
    "/resource/resource-1",
  );
  await user.click(screen.getByRole("checkbox", { name: "すべて選択" }));
  await user.click(screen.getByRole("button", { name: "1件を削除" }));
  await user.click(screen.getByRole("button", { name: "まとめて削除する" }));

  expect(deleteQuizzes).toHaveBeenCalledWith(["quiz-1"]);
  await waitFor(() =>
    expect(screen.queryByText("StudyPlan未所属クイズ")).not.toBeInTheDocument(),
  );
});
