import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Table } from "~/shared/components/ui/table";
import { AdminNativeTable, AdminTable, AdminTableFrame } from "./AdminTable";

it("sizes content frames to the table while retaining a bounded scroll area", () => {
  render(
    <AdminTableFrame layout="content" className="w-full">
      <AdminNativeTable aria-label="framed" layout="content">
        <tbody>
          <tr>
            <td>内容</td>
          </tr>
        </tbody>
      </AdminNativeTable>
    </AdminTableFrame>,
  );
  const frame = screen.getByRole("table", { name: "framed" }).parentElement;
  expect(frame).toHaveClass(
    "mx-auto",
    "w-fit",
    "max-w-full",
    "overflow-x-auto",
    "border",
  );
  expect(frame).not.toHaveClass("w-full");
});

it.each([
  ["native", AdminNativeTable],
  ["wrapped", AdminTable],
] as const)(
  "shares and enforces content/full width policies for %s tables",
  (_, Component) => {
    render(
      <>
        <Component aria-label="content" layout="content" className="w-full">
          <tbody>
            <tr>
              <td>内容</td>
            </tr>
          </tbody>
        </Component>
        <Component aria-label="full" layout="full" className="w-auto">
          <tbody>
            <tr>
              <td>全幅</td>
            </tr>
          </tbody>
        </Component>
      </>,
    );
    expect(screen.getByRole("table", { name: "content" })).toHaveClass(
      "mx-auto",
      "w-auto",
    );
    expect(screen.getByRole("table", { name: "content" })).not.toHaveClass(
      "w-full",
    );
    expect(screen.getByRole("table", { name: "full" })).toHaveClass("w-full");
    expect(screen.getByRole("table", { name: "full" })).not.toHaveClass(
      "w-auto",
    );
    expect(screen.getByRole("table", { name: "content" })).not.toHaveAttribute(
      "layout",
    );
    if (Component === AdminTable) {
      expect(
        screen.getByRole("table", { name: "content" }).parentElement,
      ).toHaveClass("mx-auto", "w-fit", "max-w-full");
      expect(
        screen.getByRole("table", { name: "content" }).parentElement,
      ).not.toHaveClass("w-full");
      expect(
        screen.getByRole("table", { name: "full" }).parentElement,
      ).toHaveClass("w-full");
    }
  },
);

it("shares column dividers across native and scroll-wrapped admin tables without changing ordinary tables", () => {
  render(
    <>
      <AdminNativeTable aria-label="native" className="mx-auto">
        <tbody>
          <tr>
            <td>名前</td>
            <td>値</td>
          </tr>
        </tbody>
      </AdminNativeTable>
      <AdminTable aria-label="wrapped" containerClassName="max-h-80">
        <tbody>
          <tr>
            <td>名前</td>
            <td>値</td>
          </tr>
        </tbody>
      </AdminTable>
      <Table aria-label="ordinary">
        <tbody>
          <tr>
            <td>通常</td>
          </tr>
        </tbody>
      </Table>
    </>,
  );
  for (const label of ["native", "wrapped"])
    expect(screen.getByRole("table", { name: label })).toHaveClass(
      "[&_tr>th:not(:last-child)]:border-r",
      "[&_tr>td:not(:last-child)]:border-r",
    );
  expect(screen.getByRole("table", { name: "native" })).toHaveClass("mx-auto");
  expect(
    screen.getByRole("table", { name: "wrapped" }).parentElement,
  ).toHaveClass("max-h-80");
  expect(screen.getByRole("table", { name: "ordinary" })).not.toHaveClass(
    "[&_tr>td:not(:last-child)]:border-r",
  );
});
