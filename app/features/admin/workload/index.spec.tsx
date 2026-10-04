import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import WorkloadSettingsManager from ".";
import {
  getQuizPreparationSettings,
  getResourceImportSettings,
  updateQuizPreparationSettings,
  updateResourceImportSettings,
} from "./api";

vi.mock("./api", () => ({
  getQuizPreparationSettings: vi.fn(),
  getResourceImportSettings: vi.fn(),
  updateQuizPreparationSettings: vi.fn(),
  updateResourceImportSettings: vi.fn(),
}));

const quiz = {
  max_concurrent_jobs: 1,
  max_concurrent_jobs_per_user: 1,
  max_quizzes_per_job: 500,
};
const resourceImport = {
  max_concurrent_imports: 1,
  max_concurrent_imports_per_user: 1,
};

beforeEach(() => {
  vi.mocked(getQuizPreparationSettings).mockResolvedValue(quiz);
  vi.mocked(getResourceImportSettings).mockResolvedValue(resourceImport);
  vi.mocked(updateQuizPreparationSettings).mockResolvedValue(quiz);
  vi.mocked(updateResourceImportSettings).mockResolvedValue(resourceImport);
});

it("クイズ作成とimportの制限をそれぞれ更新する", async () => {
  const user = userEvent.setup();
  render(<WorkloadSettingsManager />);

  const total = await screen.findByLabelText("1ジョブの総生成数上限");
  await user.clear(total);
  await user.type(total, "300");
  const imports = screen.getByLabelText("サーバー全体の同時import数");
  await user.clear(imports);
  await user.type(imports, "2");
  await user.click(screen.getByRole("button", { name: "保存" }));

  expect(updateQuizPreparationSettings).toHaveBeenCalledWith({
    ...quiz,
    max_quizzes_per_job: 300,
  });
  expect(updateResourceImportSettings).toHaveBeenCalledWith({
    ...resourceImport,
    max_concurrent_imports: 2,
  });
});
