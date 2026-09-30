import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { expect, it, vi } from "vitest";
import PersonalTimeline from "./PersonalTimeline";
import { listPersonalTanbuns, markTanbunSeen } from "./api";

function Location() {
  const location = useLocation();
  return <output aria-label="現在地">{location.pathname}</output>;
}

vi.mock("./api", () => ({
  listPersonalTanbuns: vi.fn(),
  markTanbunSeen: vi.fn(),
}));

it("単文を見た日を一日一回だけ記録する", async () => {
  vi.mocked(listPersonalTanbuns).mockResolvedValue([
    {
      uid: "sentence-1",
      sentence: "新しく取り込んだ単文",
      term_names: ["新しい知識"],
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
  render(
    <MemoryRouter>
      <PersonalTimeline />
      <Location />
    </MemoryRouter>,
  );

  await screen.findByRole("button", {
    name: "今日見たことを記録、累計2日",
  });
  const item = document.querySelector<HTMLElement>("[data-hotkey-item]");
  expect(item).not.toBeNull();
  item?.focus();
  expect(item).toHaveFocus();
  fireEvent.keyDown(item as HTMLElement, { key: " " });

  expect(
    await screen.findByRole("button", { name: "今日は記録済み、累計3日" }),
  ).toBeDisabled();
  expect(markTanbunSeen).toHaveBeenCalledWith("sentence-1");
  expect(screen.getByLabelText("スコア: 7")).toBeInTheDocument();
  expect(screen.getByText("新しい知識")).toBeInTheDocument();

  fireEvent.keyDown(item as HTMLElement, { key: "Enter" });
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/tanbun/sentence-1",
  );
});
