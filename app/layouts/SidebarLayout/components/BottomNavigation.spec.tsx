import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { vi } from "vitest";
import BottomNavigation from "./BottomNavigation";

it("主要画面へ名前付きの導線を表示する", () => {
  const onMenuOpen = vi.fn();
  render(
    <MemoryRouter initialEntries={["/quiz"]}>
      <BottomNavigation onMenuOpen={onMenuOpen} />
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
  expect(
    screen.queryByRole("link", { name: "ガイド" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "ドキュメント" }),
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "メニューを開く" }));
  expect(onMenuOpen).toHaveBeenCalledOnce();
});
