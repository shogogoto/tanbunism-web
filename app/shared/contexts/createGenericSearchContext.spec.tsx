import { act, fireEvent, render, screen } from "@testing-library/react";
import { Link, RouterProvider, createMemoryRouter } from "react-router";
import { createGenericSearchContext } from "./createGenericSearchContext";

afterEach(() => vi.useRealTimers());

const { SearchProvider, useSearch } = createGenericSearchContext({
  q: {
    defaultValue: "",
    serialize: (q: string) => ({ q }),
    deserialize: (params) => params.get("q") ?? "",
  },
});

function Search() {
  const { immediateParams, setImmediateParams } = useSearch();
  return (
    <>
      <input
        aria-label="検索"
        value={immediateParams.q}
        onChange={(event) => setImmediateParams({ q: event.target.value })}
      />
      <Link to="?page=2&size=50">ページ番号だけを更新</Link>
      <Link to="?q=previous&page=1">以前の検索へ移動</Link>
    </>
  );
}

it("preserves pending search edits on pagination-only URL changes, while honoring search navigation", async () => {
  vi.useFakeTimers();
  const router = createMemoryRouter([
    {
      path: "/",
      element: (
        <SearchProvider>
          <Search />
        </SearchProvider>
      ),
    },
  ]);
  render(<RouterProvider router={router} />);
  const input = screen.getByRole("textbox", { name: "検索" });
  fireEvent.change(input, { target: { value: "pending search" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: "ページ番号だけを更新" }));
  });
  expect(router.state.location.search).toContain("page=2");
  expect(input).toHaveValue("pending search");
  await act(async () => vi.advanceTimersByTime(500));
  expect(router.state.location.search).toContain("q=pending+search");
  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: "以前の検索へ移動" }));
  });
  expect(input).toHaveValue("previous");
});
