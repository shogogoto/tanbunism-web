import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Table } from "~/shared/components/ui/table";
import { AdminNativeTable, AdminTable } from "./AdminTable";

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
