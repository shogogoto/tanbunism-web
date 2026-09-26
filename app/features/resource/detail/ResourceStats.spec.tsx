import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import ResourceStats from "./ResourceStats";
import { resourceDetailFiture } from "./fixture";

it("Resourceの主要統計とクイズ一覧への導線を表示する", () => {
  const { resource, resource_stats: stats } =
    resourceDetailFiture.resource_info;

  render(
    <MemoryRouter>
      <ResourceStats resourceId={resource.uid} stats={stats} />
    </MemoryRouter>,
  );

  const statistics = screen.getByLabelText("Resourceの統計");
  expect(within(statistics).getByText(String(stats.n_sentence))).toBeVisible();
  expect(within(statistics).getByText(String(stats.n_term))).toBeVisible();
  expect(within(statistics).getByText(String(stats.n_edge))).toBeVisible();
  expect(screen.getByRole("link", { name: "クイズ一覧" })).toHaveAttribute(
    "href",
    `/quiz/list?resource=${resource.uid}`,
  );
});
