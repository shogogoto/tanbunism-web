import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { fixtureDetail1 } from "../../detail/fixture";
import LocationView from "./index";

it("Resource情報を主にして登録ユーザーはusernameだけ表示する", () => {
  render(
    <MemoryRouter>
      <LocationView
        loc={fixtureDetail1.location}
        tanbunId={fixtureDetail1.uid}
      />
    </MemoryRouter>,
  );

  const resourceLink = screen.getByRole("link", {
    name: /神は数学者か.*マオリ・リヴィオ.*2017-01-01/,
  });
  expect(resourceLink).toHaveAttribute(
    "href",
    `/resource/${fixtureDetail1.location.resource.uid}#${fixtureDetail1.uid}`,
  );
  expect(screen.getByRole("link", { name: "@GTO" })).toHaveAttribute(
    "href",
    "/user/GTO",
  );
  expect(screen.queryByText("ニートおじさん")).not.toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
