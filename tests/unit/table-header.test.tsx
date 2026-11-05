// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { afterEach, expect, it } from "vitest";
import { DataTable } from "@/shared/ui/data-table";

afterEach(cleanup);
const data = [{ title: "Б" }, { title: "А" }];
const columns = [{ accessorKey: "title", header: "Задача" }];
function TestTable() {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  return <DataTable table={table} />;
}
it("exposes sorting direction and the next action through accessible controls", () => {
  render(<TestTable />);
  const header = screen.getByRole("columnheader");
  expect(header.getAttribute("aria-sort")).toBe("none");
  fireEvent.click(
    screen.getByRole("button", { name: "Задача: сортировать по возрастанию" }),
  );
  expect(header.getAttribute("aria-sort")).toBe("ascending");
  expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
    "А",
    "Б",
  ]);
  fireEvent.click(
    screen.getByRole("button", { name: "Задача: сортировать по убыванию" }),
  );
  expect(header.getAttribute("aria-sort")).toBe("descending");
  fireEvent.click(
    screen.getByRole("button", { name: "Задача: сбросить сортировку" }),
  );
  expect(header.getAttribute("aria-sort")).toBe("none");
  expect(screen.getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
    "Б",
    "А",
  ]);
});
