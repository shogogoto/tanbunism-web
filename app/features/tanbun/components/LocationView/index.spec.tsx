import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { fixtureDetail1 } from "../../detail/fixture";
import LocationView from "./index";

it("ユーザーから現在の単文までの保存場所を表示する", () => {
  const current =
    fixtureDetail1.knowdes[fixtureDetail1.uid.replaceAll("-", "")];
  render(
    <MemoryRouter>
      <LocationView
        loc={fixtureDetail1.location}
        tanbunId={fixtureDetail1.uid}
        current={current}
      />
    </MemoryRouter>,
  );

  const breadcrumb = screen.getByRole("navigation", { name: "保存場所" });
  expect(breadcrumb).toHaveTextContent(
    "@GTOphilos# 神は数学者か？アルキメデス",
  );
  const resourceLink = screen.getByRole("link", { name: "# 神は数学者か？" });
  expect(resourceLink).toHaveAttribute(
    "href",
    `/resource/${fixtureDetail1.location.resource.uid}#${fixtureDetail1.uid}`,
  );
  expect(screen.getByRole("link", { name: "@GTO" })).toHaveAttribute(
    "href",
    "/user/GTO",
  );
  expect(screen.getByText("アルキメデス")).toHaveAttribute(
    "aria-current",
    "page",
  );
});
