import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import PersonalTimeline from "./PersonalTimeline";
import { listPersonalTanbuns, markTanbunSeen } from "./api";

vi.mock("./api", () => ({
  listPersonalTanbuns: vi.fn(),
  markTanbunSeen: vi.fn(),
}));

it("単文を見た日を一日一回だけ記録する", async () => {
  vi.mocked(listPersonalTanbuns).mockResolvedValue([
    {
      uid: "sentence-1",
      sentence: "新しく取り込んだ単文",
      resource_uid: "resource-1",
      resource_name: "読書メモ",
      updated_at: "2026-09-28T00:00:00Z",
      score: 7,
      exposure_count: 2,
      seen_today: false,
    },
  ]);
  vi.mocked(markTanbunSeen).mockResolvedValue({
    sentence_id: "sentence-1",
    seen_on: "2026-09-28",
    exposure_count: 3,
    recorded: true,
  });
  const user = userEvent.setup();

  render(
    <MemoryRouter>
      <PersonalTimeline />
    </MemoryRouter>,
  );

  await user.click(
    await screen.findByRole("button", {
      name: "今日見たことを記録、累計2日",
    }),
  );

  expect(markTanbunSeen).toHaveBeenCalledWith("sentence-1");
  expect(
    screen.getByRole("button", { name: "今日は記録済み、累計3日" }),
  ).toBeDisabled();
  expect(screen.getByLabelText("スコア: 7")).toBeInTheDocument();
});
