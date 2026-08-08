import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import MainView from "./MainView";
import { fixtureDetail1 } from "./fixture";

vi.mock("~/shared/history/hooks", () => ({
  useHistory: () => ({
    addHistory: vi.fn(),
    getTanbunTitle: vi.fn(() => "単文"),
  }),
}));
vi.mock("../components/TanbunCard", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../components/TanbunCard")>();
  return {
    ...original,
    createStatView: () => ({
      detail: null,
      premise: null,
      conclusion: null,
      refer: null,
      referred: null,
    }),
  };
});
vi.mock("../components/LocationView", () => ({ default: () => null }));
vi.mock("./TanbunGroup", () => ({ default: () => <div>関係する単文</div> }));
vi.mock("./TanbunGroup/Parents", () => ({
  default: () => <div>親の単文</div>,
}));
vi.mock("./TanbunGroup/TanbunGroup2", () => ({
  default: () => <div>関係する単文</div>,
}));

describe("単文詳細", () => {
  it("詳細・論理・参照の関係を一つの画面で一覧する", () => {
    render(
      <MemoryRouter initialEntries={["/tanbun/sentence-1"]}>
        <MainView detail={fixtureDetail1} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "詳細" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "論理" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "参照" })).toBeVisible();
    expect(screen.getByText("親")).toBeVisible();
    expect(screen.getByText("子")).toBeVisible();
    expect(screen.getByText("前提")).toBeVisible();
    expect(screen.getByText("結論")).toBeVisible();
    expect(screen.getByText("参照している")).toBeVisible();
    expect(screen.getByText("参照されている")).toBeVisible();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });
});
