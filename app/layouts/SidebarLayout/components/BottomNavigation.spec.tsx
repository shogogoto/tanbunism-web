import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import BottomNavigation from "./BottomNavigation";

vi.mock("~/shared/components/ui/sidebar", () => ({
  useSidebar: () => ({ toggleSidebar: vi.fn() }),
}));

it("主要画面へ名前付きの導線を表示する", () => {
  render(
    <MemoryRouter initialEntries={["/quiz"]}>
      <BottomNavigation />
    </MemoryRouter>,
  );

  expect(screen.getByRole("button", { name: "メニューを開く" })).toBeVisible();
  expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute(
    "href",
    "/home",
  );
  expect(screen.getByRole("link", { name: "検索" })).toHaveAttribute(
    "href",
    "/search",
  );
  expect(screen.getByRole("link", { name: "クイズ" })).toHaveAttribute(
    "href",
    "/quiz",
  );
  expect(screen.getByRole("link", { name: "ガイド" })).toHaveAttribute(
    "href",
    "/docs/toc",
  );
});
