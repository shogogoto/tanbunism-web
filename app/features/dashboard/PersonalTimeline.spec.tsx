import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { expect, it, vi } from "vitest";
import PersonalTimeline from "./PersonalTimeline";
import {
  getTodayTanbunExposureCount,
  listPersonalTanbuns,
  markTanbunSeen,
} from "./api";

function Location() {
  const location = useLocation();
  return <output aria-label="現在地">{location.pathname}</output>;
}

vi.mock("./api", () => ({
  listPersonalTanbuns: vi.fn(),
  getTodayTanbunExposureCount: vi.fn(),
  markTanbunSeen: vi.fn(),
}));

it("単文を見た日を一日一回だけ記録する", async () => {
  const item = {
    uid: "sentence-1",
    sentence: "新しく取り込んだ単文",
    term_names: ["新しい知識"],
    resource_uid: "resource-1",
    resource_name: "読書メモ",
    updated_at: "2026-09-28T00:00:00Z",
    score: 7,
    exposure_count: 2,
    seen_today: false,
  };
  vi.mocked(listPersonalTanbuns).mockResolvedValue([item]);
  vi.mocked(getTodayTanbunExposureCount)
    .mockResolvedValueOnce({ seen_on: "2026-09-28", count: 0 })
    .mockResolvedValueOnce({ seen_on: "2026-09-28", count: 1 });
  let completeRequest:
    | ((result: Awaited<ReturnType<typeof markTanbunSeen>>) => void)
    | undefined;
  vi.mocked(markTanbunSeen).mockImplementation(
    () =>
      new Promise((resolve) => {
        completeRequest = resolve;
      }),
  );
  render(
    <MemoryRouter>
      <PersonalTimeline />
      <Location />
    </MemoryRouter>,
  );

  await screen.findByRole("button", {
    name: "今日見たことを記録、累計2日",
  });
  const timelineItem =
    document.querySelector<HTMLElement>("[data-hotkey-item]");
  expect(timelineItem).not.toBeNull();
  timelineItem?.focus();
  expect(timelineItem).toHaveFocus();
  fireEvent.keyDown(timelineItem as HTMLElement, { key: " " });

  // APIの応答を待たず、押した瞬間に表示する。
  expect(
    screen.getByRole("button", { name: "今日は記録済み、累計3日" }),
  ).toBeDisabled();
  expect(screen.getByText("1件")).toBeVisible();
  expect(markTanbunSeen).toHaveBeenCalledWith("sentence-1");

  await act(async () => {
    completeRequest?.({
      sentence_id: "sentence-1",
      seen_on: "2026-09-28",
      exposure_count: 3,
      recorded: true,
    });
  });

  expect(
    screen.getByRole("button", { name: "今日は記録済み、累計3日" }),
  ).toBeDisabled();
  expect(screen.getByText("新しく取り込んだ単文")).toBeVisible();
  expect(screen.getByLabelText("スコア: 7")).toBeInTheDocument();
  const seenButton = screen.getByRole("button", {
    name: "今日は記録済み、累計3日",
  });
  expect(seenButton.nextElementSibling).toBe(
    screen.getByLabelText("スコア: 7"),
  );
  expect(screen.getByText("新しい知識")).toBeInTheDocument();

  fireEvent.keyDown(timelineItem as HTMLElement, { key: "Enter" });
  expect(screen.getByRole("status", { name: "現在地" })).toHaveTextContent(
    "/tanbun/sentence-1",
  );
});

it("記録に失敗したら表示を元に戻す", async () => {
  vi.mocked(listPersonalTanbuns).mockResolvedValue([
    {
      uid: "sentence-1",
      sentence: "新しく取り込んだ単文",
      term_names: [],
      resource_uid: "resource-1",
      resource_name: "読書メモ",
      updated_at: null,
      exposure_count: 2,
      seen_today: false,
    },
  ]);
  vi.mocked(getTodayTanbunExposureCount).mockResolvedValue({
    seen_on: "2026-09-28",
    count: 0,
  });
  let failRequest: ((reason: Error) => void) | undefined;
  vi.mocked(markTanbunSeen).mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        failRequest = reject;
      }),
  );
  render(
    <MemoryRouter>
      <PersonalTimeline />
    </MemoryRouter>,
  );

  const button = await screen.findByRole("button", {
    name: "今日見たことを記録、累計2日",
  });
  fireEvent.click(button);
  expect(
    screen.getByRole("button", { name: "今日は記録済み、累計3日" }),
  ).toBeDisabled();

  await act(async () => {
    failRequest?.(new Error("記録に失敗しました"));
  });

  expect(
    screen.getByRole("button", {
      name: "今日見たことを記録、累計2日",
    }),
  ).toBeEnabled();
  expect(screen.getByText("0件")).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent("記録に失敗しました");
});
