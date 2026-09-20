import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { fixtureDetail1 } from "~/features/tanbun/detail/fixture";
import UserHeader from "./UserHeader";

it("登録ユーザーをusernameだけで控えめに表示する", () => {
  render(
    <MemoryRouter>
      <UserHeader user={fixtureDetail1.location.user} />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "@GTO" })).toHaveAttribute(
    "href",
    "/user/GTO",
  );
  expect(screen.queryByText("ニートおじさん")).not.toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
