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
