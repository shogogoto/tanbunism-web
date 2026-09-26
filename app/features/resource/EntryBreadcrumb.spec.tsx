import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import EntryBreadcrumb from "./EntryBreadcrumb";
import { resourceDetailFiture } from "./detail/fixture";

it("ユーザーからEntryを経てResourceまでの保存場所を表示する", () => {
  const { user, resource } = resourceDetailFiture.resource_info;
  const folders = [
    { uid: "entry-1", name: "humanities" },
    { uid: "entry-2", name: "philosophy" },
  ];

  render(
    <MemoryRouter>
      <EntryBreadcrumb user={user} folders={folders} resource={resource} />
    </MemoryRouter>,
  );

  const breadcrumb = screen.getByRole("navigation", { name: "保存場所" });
  expect(breadcrumb).toHaveTextContent(
    `@GTOhumanitiesphilosophy${resource.name}`,
  );
  expect(screen.getByRole("link", { name: "@GTO" })).toHaveAttribute(
    "href",
    "/user/GTO",
  );
  expect(screen.getByRole("link", { name: "humanities" })).toHaveAttribute(
    "href",
    "/entry/entry-1",
  );
  expect(screen.getByRole("link", { name: "philosophy" })).toHaveAttribute(
    "href",
    "/entry/entry-2",
  );
  expect(screen.getByText(resource.name)).toHaveAttribute(
    "aria-current",
    "page",
  );
});
