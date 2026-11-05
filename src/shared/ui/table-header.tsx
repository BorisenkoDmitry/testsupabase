import { flexRender, type Header } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export function TableHeader<T>({ header }: { header: Header<T, unknown> }) {
  const { column } = header;
  const sortable = !header.isPlaceholder && column.getCanSort();
  const sorted = column.getIsSorted();
  const next = column.getNextSortingOrder();
  const action =
    next === "asc"
      ? "Сортировать по возрастанию"
      : next === "desc"
        ? "Сортировать по убыванию"
        : "Сбросить сортировку";
  const label =
    typeof column.columnDef.header === "string"
      ? column.columnDef.header
      : column.id;
  const Icon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  const content = header.isPlaceholder
    ? null
    : flexRender(column.columnDef.header, header.getContext());
  return (
    <th
      aria-sort={
        sortable
          ? sorted === "asc"
            ? "ascending"
            : sorted === "desc"
              ? "descending"
              : "none"
          : undefined
      }
    >
      {sortable ? (
        <button
          type="button"
          className="table-sort-button"
          onClick={column.getToggleSortingHandler()}
          title={action}
          aria-label={`${label}: ${action.toLowerCase()}`}
        >
          {content}
          <Icon size={13} aria-hidden="true" />
        </button>
      ) : (
        content
      )}
    </th>
  );
}
