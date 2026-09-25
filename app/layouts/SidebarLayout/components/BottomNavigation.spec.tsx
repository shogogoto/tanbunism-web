import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import BottomNavigation from "./BottomNavigation";

it("主要画面へ名前付きの導線を表示する", () => {
  render(
    <MemoryRouter initialEntries={["/quiz"]}>
      <BottomNavigation />
    </MemoryRouter>,
  );

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
  expect(screen.getByRole("link", { name: "ドキュメント" })).toHaveAttribute(
    "href",
    "/docs/toc",
  );
});
