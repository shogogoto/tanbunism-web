import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import BrokenQuizRepairDialog from "./BrokenQuizRepairDialog";
import {
  listResourceSentenceCandidates,
  repairBrokenQuizReference,
} from "./api";

vi.mock("./api", () => ({
  listResourceSentenceCandidates: vi.fn(),
  repairBrokenQuizReference: vi.fn(),
}));

it("同じResourceの現行単文を選んで参照を修復する", async () => {
  const user = userEvent.setup();
  const onRepaired = vi.fn();
  vi.mocked(listResourceSentenceCandidates).mockResolvedValue([
    { uid: "sentence-1", sentence: "候補ではない単文" },
    { uid: "sentence-2", sentence: "修正後の単文" },
  ]);
  vi.mocked(repairBrokenQuizReference).mockResolvedValue({
    quiz_targets: 1,
    quiz_options: 0,
    quiz_corrects: 0,
    retained: false,
  });

  render(
    <BrokenQuizRepairDialog
      reference={{
        quiz_id: "quiz-1",
        quiz_type: "term2sent",
        retired_sentence_id: "retired-1",
        retired_value: "修正前の単文",
        resource_id: "resource-1",
        roles: ["QUIZ_TARGET"],
        retired_at: "2026-09-30T00:00:00Z",
      }}
      resourceName="論理学ノート"
      onRepaired={onRepaired}
    />,
  );

  await user.click(screen.getByRole("button", { name: "修復" }));
  expect(listResourceSentenceCandidates).toHaveBeenCalledWith("resource-1");
  await user.type(screen.getByLabelText("修復先の単文を検索"), "修正後");
  await user.click(screen.getByText("修正後の単文"));
  await user.click(
    screen.getByRole("button", { name: "この単文へ付け替える" }),
  );

  expect(repairBrokenQuizReference).toHaveBeenCalledWith(
    "quiz-1",
    "retired-1",
    "sentence-2",
  );
  expect(onRepaired).toHaveBeenCalledOnce();
});
