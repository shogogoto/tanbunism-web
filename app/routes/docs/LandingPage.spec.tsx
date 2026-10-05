import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import LandingPage from "./LandingPage";

const auth = vi.hoisted(() => ({ isAuthenticated: true }));

vi.mock("~/features/auth/AuthProvider", () => ({
  useAuth: () => auth,
}));

beforeEach(() => {
  auth.isAuthenticated = true;
});

it("ログイン済みなら復習へ移動する", async () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="review" element={<div>復習画面</div>} />
      </Routes>
    </MemoryRouter>,
  );

  expect(await screen.findByText("復習画面")).toBeVisible();
});

it("明示的に開いたトップはログイン済みでも表示する", () => {
  render(
    <MemoryRouter initialEntries={["/about"]}>
      <LandingPage />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { level: 1, name: "tanbunism" }),
  ).toBeInTheDocument();
});

it("未ログインでもトップを表示する", () => {
  auth.isAuthenticated = false;

  render(
    <MemoryRouter initialEntries={["/"]}>
      <LandingPage />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { level: 1, name: "tanbunism" }),
  ).toBeInTheDocument();
});
