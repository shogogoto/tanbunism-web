import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import QuizPreparationSettingsManager from ".";
import {
  getQuizPreparationSettings,
  updateQuizPreparationSettings,
} from "./api";

vi.mock("./api", () => ({
  getQuizPreparationSettings: vi.fn(),
  updateQuizPreparationSettings: vi.fn(),
}));

const settings = {
  max_concurrent_jobs: 1,
  max_concurrent_jobs_per_user: 1,
  max_quizzes_per_job: 500,
};

beforeEach(() => {
  vi.mocked(getQuizPreparationSettings).mockResolvedValue(settings);
  vi.mocked(updateQuizPreparationSettings).mockResolvedValue(settings);
});

it("一括クイズ作成の制限を更新する", async () => {
  const user = userEvent.setup();
  render(<QuizPreparationSettingsManager />);

  const total = await screen.findByLabelText("1ジョブの総生成数上限");
  await user.clear(total);
  await user.type(total, "300");
  await user.click(screen.getByRole("button", { name: "保存" }));

  expect(updateQuizPreparationSettings).toHaveBeenCalledWith({
    ...settings,
    max_quizzes_per_job: 300,
  });
});
