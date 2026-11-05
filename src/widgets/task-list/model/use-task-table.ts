import { useMemo } from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type { TaskListItem } from "@/entities/task";
import { useTaskFilters } from "@/features/task-filters";
import { createTaskColumns } from "../ui/task-columns";
import type { TaskListProps } from "./types";
export function useTaskTable({
  page,
  manager,
  showObject = true,
  sorting,
  onSortingChange,
  onPaginationChange,
}: TaskListProps) {
  const filters = useTaskFilters();
  const columns = useMemo(
    () => createTaskColumns({ showObject }),
    [showObject],
  );
  const table = useReactTable<TaskListItem>({
    data: page.items,
    columns,
    rowCount: page.total,
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    state: {
      sorting,
      pagination: { pageIndex: page.pageIndex, pageSize: page.pageSize },
      columnVisibility: { assigneeId: manager, objectId: false },
    },
    onSortingChange,
    onPaginationChange,
    getRowId: (task) => task.id,
    getCoreRowModel: getCoreRowModel(),
    enableMultiSort: false,
    autoResetPageIndex: false,
    defaultColumn: { sortDescFirst: false },
  });
  const active =
    !!filters.search ||
    filters.status !== "all" ||
    (manager && filters.assigneeId !== "all") ||
    (showObject && filters.objectId !== "all");
  return { table, active };
}
