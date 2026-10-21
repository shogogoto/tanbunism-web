import { useState } from "react";

export default function useTableSort<T>(
  rows: T[],
  value: (row: T, column: string) => string | number,
) {
  const [sort, setSort] = useState<{ column: string; descending: boolean }>();
  const sorted = sort
    ? [...rows].sort((a, b) => {
        const left = value(a, sort.column);
        const right = value(b, sort.column);
        const comparison =
          typeof left === "number" && typeof right === "number"
            ? left - right
            : String(left).localeCompare(String(right), "ja", {
                numeric: true,
              });
        return sort.descending ? -comparison : comparison;
      })
    : rows;
  function header(column: string, label: string) {
    const active = sort?.column === column;
    return (
      <th
        key={column}
        scope="col"
        aria-sort={
          active ? (sort.descending ? "descending" : "ascending") : "none"
        }
        className="p-2 text-left font-medium"
      >
        <button
          type="button"
          className="whitespace-nowrap hover:text-foreground"
          onClick={() =>
            setSort({ column, descending: active ? !sort.descending : false })
          }
        >
          {label}
          {active ? (sort.descending ? " ↓" : " ↑") : " ↕"}
        </button>
      </th>
    );
  }
  return { sorted, header };
}
