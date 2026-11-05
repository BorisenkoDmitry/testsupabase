// Offline test/demo transport. Production executes list operations in Supabase.
import type {
  Page,
  PageRequest,
  Task,
  TaskListRequest,
  TaskPage,
  ObjectListRequest,
  ObjectPage,
  ConstructionObject,
  User,
} from "../contracts";
const collator = new Intl.Collator("ru", {
  numeric: true,
  sensitivity: "base",
});
export function mockPage<T>(items: T[], request: PageRequest = {}): Page<T> {
  const pageSize = request.pageSize ?? 10;
  const pageIndex = Math.max(
    0,
    Math.min(request.pageIndex ?? 0, Math.ceil(items.length / pageSize) - 1),
  );
  return {
    items: items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    total: items.length,
    pageIndex,
    pageSize,
  };
}
export function mockTasks(
  tasks: Task[],
  objects: ConstructionObject[],
  users: User[],
  request: TaskListRequest = {},
): TaskPage {
  const base = tasks.filter(
    (t) => !request.objectId || t.objectId === request.objectId,
  );
  const filtered = base.filter(
    (t) =>
      (!request.status || t.status === request.status) &&
      (!request.assigneeId || t.assigneeId === request.assigneeId) &&
      t.title
        .toLocaleLowerCase()
        .includes(request.search?.trim().toLocaleLowerCase() ?? ""),
  );
  const items = filtered.map((t) => ({
    ...t,
    objectName: objects.find((o) => o.id === t.objectId)?.name ?? "",
    assigneeName: users.find((u) => u.id === t.assigneeId)?.name ?? "",
  }));
  const statuses = ["new", "in_progress", "review", "revision", "accepted"];
  items.sort((a, b) => {
    const field = request.sortBy ?? "createdAt";
    const order =
      field === "status"
        ? statuses.indexOf(a.status) - statuses.indexOf(b.status)
        : collator.compare(a[field], b[field]);
    return (
      order * (request.sortDirection === "asc" ? 1 : -1) ||
      a.id.localeCompare(b.id)
    );
  });
  return {
    ...mockPage(items, request),
    summary: {
      total: base.length,
      newCount: base.filter((t) => t.status === "new").length,
      inProgressCount: base.filter(
        (t) => t.status === "in_progress" || t.status === "revision",
      ).length,
      reviewCount: base.filter((t) => t.status === "review").length,
    },
  };
}
export function mockObjects(
  objects: ConstructionObject[],
  tasks: Task[],
  request: ObjectListRequest = {},
): ObjectPage {
  const items = objects
    .filter((o) =>
      `${o.name} ${o.address}`
        .toLocaleLowerCase()
        .includes(request.search?.trim().toLocaleLowerCase() ?? ""),
    )
    .map((o) => ({
      ...o,
      taskCount: tasks.filter((t) => t.objectId === o.id).length,
      acceptedCount: tasks.filter(
        (t) => t.objectId === o.id && t.status === "accepted",
      ).length,
      reviewCount: tasks.filter(
        (t) => t.objectId === o.id && t.status === "review",
      ).length,
    }));
  items.sort(
    (a, b) =>
      collator.compare(
        a[request.sortBy ?? "createdAt"],
        b[request.sortBy ?? "createdAt"],
      ) * (request.sortDirection === "asc" ? 1 : -1) ||
      a.id.localeCompare(b.id),
  );
  return {
    ...mockPage(items, request),
    summary: {
      objectCount: objects.length,
      activeTaskCount: tasks.filter((t) => t.status !== "accepted").length,
      reviewCount: tasks.filter((t) => t.status === "review").length,
    },
  };
}
