import { useMemo } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { Task } from "@/entities/task";
import { useTaskFilters } from "@/features/task-filters";
import { useDebounce } from "@/shared/lib/use-debounce";
import { createTaskColumns } from "../ui/task-columns";
import type { TaskListProps } from "./types";

export function useTaskTable({
  tasks,
  objects,
  users,
  manager,
  showObject = true,
}: TaskListProps) {
  const filters = useTaskFilters();
  const search = useDebounce(filters.search, 300);
  const columns = useMemo(
    () => createTaskColumns({ objects, users, showObject }),
    [objects, users, showObject],
  );
  const columnFilters = useMemo(
    () => [
      ...(search.trim() ? [{ id: "title", value: search.trim() }] : []),
      ...(filters.status !== "all"
        ? [{ id: "status", value: filters.status }]
        : []),
      ...(manager && filters.assigneeId !== "all"
        ? [{ id: "assigneeId", value: filters.assigneeId }]
        : []),
      ...(showObject && filters.objectId !== "all"
        ? [{ id: "objectId", value: filters.objectId }]
        : []),
    ],
    [
      search,
      filters.status,
      filters.assigneeId,
      filters.objectId,
      manager,
      showObject,
    ],
  );
  const table = useReactTable<Task>({
    data: tasks,
    columns,
    state: {
      columnFilters,
      columnVisibility: { assigneeId: manager, objectId: false },
    },
    getRowId: (task) => task.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: false,
    defaultColumn: { sortDescFirst: false },
  });
  const active =
    !!filters.search ||
    filters.status !== "all" ||
    (manager && filters.assigneeId !== "all") ||
    (showObject && filters.objectId !== "all");
  return { table, active };
}
