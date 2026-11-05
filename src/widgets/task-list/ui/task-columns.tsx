import { Link } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { StatusBadge, statusOrder, type Task } from "@/entities/task";
import type { ConstructionObject } from "@/entities/object";
import type { User } from "@/entities/user";
import { Button } from "@/shared/ui/button";
import { formatDate, initials } from "@/shared/lib/utils";

export function createTaskColumns({
  objects,
  users,
  showObject,
}: {
  objects: ConstructionObject[];
  users: User[];
  showObject: boolean;
}): ColumnDef<Task>[] {
  const objectNames = new Map(
    objects.map((object) => [object.id, object.name]),
  );
  const people = new Map(users.map((user) => [user.id, user]));
  const collator = new Intl.Collator("ru", {
    numeric: true,
    sensitivity: "base",
  });
  return [
    {
      accessorKey: "title",
      header: "Задача",
      filterFn: "includesString",
      sortingFn: (a, b) => collator.compare(a.original.title, b.original.title),
      cell: ({ row }) => (
        <>
          <Link to={`/tasks/${row.id}`} className="task-title-link">
            {row.original.title}
            <ArrowUpRight size={15} />
          </Link>
          {showObject && (
            <span className="table-secondary">
              {objectNames.get(row.original.objectId)}
            </span>
          )}
        </>
      ),
    },
    {
      accessorKey: "status",
      header: "Статус",
      filterFn: "equalsString",
      sortingFn: (a, b) =>
        statusOrder.indexOf(a.original.status) -
        statusOrder.indexOf(b.original.status),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "assigneeId",
      header: "Исполнитель",
      filterFn: "equalsString",
      sortingFn: (a, b) =>
        collator.compare(
          people.get(a.original.assigneeId)?.name ?? "",
          people.get(b.original.assigneeId)?.name ?? "",
        ),
      cell: ({ row }) => {
        const name =
          people.get(row.original.assigneeId)?.name ??
          "Неизвестный пользователь";
        return (
          <span className="person">
            <span className="avatar avatar-tiny">{initials(name)}</span>
            {name}
          </span>
        );
      },
    },
    {
      accessorKey: "objectId",
      header: "Объект",
      filterFn: "equalsString",
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: "Создана",
      sortDescFirst: true,
      sortingFn: (a, b) =>
        Date.parse(a.original.createdAt) - Date.parse(b.original.createdAt),
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
