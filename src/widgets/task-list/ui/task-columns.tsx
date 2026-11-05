import { Link } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { StatusBadge, type TaskListItem } from "@/entities/task";
import { Button } from "@/shared/ui/button";
import { formatDate, initials } from "@/shared/lib/utils";
export function createTaskColumns({
  showObject,
}: {
  showObject: boolean;
}): ColumnDef<TaskListItem>[] {
  return [
    {
      accessorKey: "title",
      header: "Задача",
      cell: ({ row }) => (
        <>
          <Link to={`/tasks/${row.id}`} className="task-title-link">
            {row.original.title}
            <ArrowUpRight size={15} />
          </Link>
          {showObject && (
            <span className="table-secondary">{row.original.objectName}</span>
          )}
        </>
      ),
    },
    {
      accessorKey: "status",
      header: "Статус",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "assigneeId",
      header: "Исполнитель",
      cell: ({ row }) => (
        <span className="person">
          <span className="avatar avatar-tiny">
            {initials(row.original.assigneeName)}
          </span>
          {row.original.assigneeName}
        </span>
      ),
    },
    { accessorKey: "objectId", header: "Объект", enableSorting: false },
    {
      accessorKey: "createdAt",
      header: "Создана",
      sortDescFirst: true,
      cell: ({ row }) => (
        <span className="date-cell">{formatDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Открыть</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <Button size="icon" variant="ghost" asChild>
          <Link
            to={`/tasks/${row.id}`}
            aria-label={`Открыть: ${row.original.title}`}
          >
            <ChevronRight size={17} />
          </Link>
        </Button>
      ),
    },
  ];
}
