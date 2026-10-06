import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { fixtureDetail1 } from "../../detail/fixture";
import LocationView from "./index";

it("章と親の保存場所を表示し、現在の単文は繰り返さない", () => {
  const current =
    fixtureDetail1.knowdes[fixtureDetail1.uid.replaceAll("-", "")];
  render(
    <MemoryRouter>
      <LocationView
        loc={{
          ...fixtureDetail1.location,
          parents: fixtureDetail1.location.parents.slice(0, 2),
        }}
        tanbunId={fixtureDetail1.uid}
        current={current}
      />
    </MemoryRouter>,
  );

  const breadcrumb = screen.getByRole("navigation", { name: "保存場所" });
  expect(breadcrumb).toHaveTextContent("@GTOphilos# 神は数学者か？");
  const resourceLink = screen.getByRole("link", { name: "# 神は数学者か？" });
  expect(resourceLink).toHaveAttribute(
    "href",
    `/resource/${fixtureDetail1.location.resource.uid}#${fixtureDetail1.uid}`,
  );
  expect(screen.getByRole("link", { name: "@GTO" })).toHaveAttribute(
    "href",
    "/user/GTO",
  );
  const chapter = fixtureDetail1.location.headers[0];
  expect(screen.getByRole("link", { name: chapter.val })).toHaveAttribute(
    "href",
    `/resource/${fixtureDetail1.location.resource.uid}#${chapter.uid}`,
  );
  const parent = fixtureDetail1.location.parents[1];
  expect(screen.getByRole("link", { name: parent.sentence })).toHaveAttribute(
    "href",
    `/tanbun/${parent.uid}`,
  );
  expect(screen.queryByText("アルキメデス")).not.toBeInTheDocument();
  expect(breadcrumb).not.toHaveTextContent(current.sentence);
});

it("長い経路も直近の親を残し、省略した親へ移動できる", async () => {
  const user = userEvent.setup();
  const current =
    fixtureDetail1.knowdes[fixtureDetail1.uid.replaceAll("-", "")];
  render(
    <MemoryRouter>
      <LocationView
        loc={fixtureDetail1.location}
        tanbunId={current.uid}
        current={current}
      />
    </MemoryRouter>,
  );
  const nearestParent =
    fixtureDetail1.location.parents[fixtureDetail1.location.parents.length - 1];
  expect(
    screen.getByRole("link", { name: nearestParent.sentence }),
  ).toHaveAttribute("href", `/tanbun/${nearestParent.uid}`);
  const hiddenParent = fixtureDetail1.location.parents[1];
  expect(
    screen.queryByRole("link", { name: hiddenParent.sentence }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "省略された親経路を開く" }),
  );
  expect(
    screen.getByRole("menuitem", { name: hiddenParent.sentence }),
  ).toHaveAttribute("href", `/tanbun/${hiddenParent.uid}`);
});

it("親のAPIデータに現在の単文が含まれても、IDの表記違いで重複しない", () => {
  const current =
    fixtureDetail1.knowdes[fixtureDetail1.uid.replaceAll("-", "")];
  const loc = {
    ...fixtureDetail1.location,
    parents: [
      { ...current, uid: current.uid.replaceAll("-", "").toUpperCase() },
    ],
  };
  render(
    <MemoryRouter>
      <LocationView loc={loc} tanbunId={current.uid} current={current} />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("navigation", { name: "保存場所" }),
  ).not.toHaveTextContent(current.sentence);
});
