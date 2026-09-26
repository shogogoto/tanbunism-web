import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import LandingPage from "./LandingPage";

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

it("ログイン済みならダッシュボードへ移動する", async () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="dashboard" element={<div>ダッシュボード画面</div>} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText("ダッシュボード画面")).toBeVisible();
});

it("明示的に開いたトップはログイン済みでも表示する", () => {
  render(
    <MemoryRouter initialEntries={["/about"]}>
      <LandingPage redirectAuthenticated={false} />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { level: 1, name: "tanbunism" }),
  ).toBeInTheDocument();
});
