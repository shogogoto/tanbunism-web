import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import Review from ".";
import ReviewHeaderTabs from "./ReviewHeaderTabs";

vi.mock("~/features/auth/AuthGuard", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "review-test" } }),
}));
vi.mock("./ReviewSettingsSelector", () => ({ default: () => null }));
vi.mock("./PersonalTimeline", () => ({
  default: () => <input aria-label="知識の状態" defaultValue="初期値" />,
}));
vi.mock("./QuizTimeline", () => ({
  default: () => <p>個人の日替わりクイズ</p>,
}));
vi.mock("~/features/quiz/QuizSession", () => ({
  default: () => <p>計画の準備済みクイズ</p>,
}));

it("復習の知識・クイズを切り替えても知識側の状態を保持する", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/review"]}>
      <ReviewHeaderTabs />
      <Review />
    </MemoryRouter>,
  );
  expect(screen.getByRole("tab", { name: "知識" })).toHaveAttribute(
    "title",
    "Ctrl+1",
  );
  await user.type(screen.getByRole("textbox", { name: "知識の状態" }), "保持");
  await user.click(screen.getByRole("tab", { name: "クイズ" }));
  expect(screen.getByText("個人の日替わりクイズ")).toBeVisible();
  await user.click(screen.getByRole("tab", { name: "知識" }));
  expect(screen.getByRole("textbox", { name: "知識の状態" })).toHaveValue(
    "初期値保持",
  );
});

it("学習計画から来たときはその計画の準備済みクイズを表示する", () => {
  render(
    <MemoryRouter initialEntries={["/review?view=quiz&plan=plan-1"]}>
      <Review />
    </MemoryRouter>,
  );
  expect(screen.getByText("計画の準備済みクイズ")).toBeVisible();
  expect(screen.queryByText("個人の日替わりクイズ")).not.toBeInTheDocument();
});
