import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  SortingState,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";
import { useSession } from "@/entities/session";
import { tasksQuery } from "@/entities/task";
import { objectOptionsQuery } from "@/entities/object";
import { usersQuery } from "@/entities/user";
import {
  useTaskFilters,
  useFiltersDispatch,
  paginationChanged,
  sortingChanged,
} from "@/features/task-filters";
import { useDebounce } from "@/shared/lib/use-debounce";
import type { TaskSort, TaskPage, TaskListRequest } from "@/shared/api";
import type { TaskListProps } from "./types";
const empty: TaskPage = {
  items: [],
  total: 0,
  pageIndex: 0,
  pageSize: 10,
  summary: { total: 0, newCount: 0, inProgressCount: 0, reviewCount: 0 },
};
export function useTaskListData(objectId?: string) {
  const { user } = useSession();
  const manager = user!.role === "manager";
  const filters = useTaskFilters(),
    dispatch = useFiltersDispatch();
  const search = useDebounce(filters.search, 300);
  const scopeKey = objectId ?? "all";
  const request: TaskListRequest = {
    search: search.trim(),
    objectId:
      objectId ?? (filters.objectId === "all" ? undefined : filters.objectId),
    status: filters.status === "all" ? undefined : filters.status,
    assigneeId:
      manager && filters.assigneeId !== "all" ? filters.assigneeId : undefined,
    sortBy: filters.sortBy ?? "createdAt",
    sortDirection: filters.sortBy ? filters.sortDirection : "desc",
    pageIndex: filters.scopeKey === scopeKey ? filters.pageIndex : 0,
    pageSize: filters.pageSize,
  };
  const tasks = useQuery({
    ...tasksQuery(user!.id, request),
    placeholderData: keepPreviousData,
  });
  const objects = useQuery({
    ...objectOptionsQuery(user!.id),
    enabled: !objectId,
  });
  const users = useQuery({ ...usersQuery(user!.id, true), enabled: manager });
  const page = tasks.data ?? empty;
  const sorting: SortingState = filters.sortBy
    ? [
        {
          id: filters.sortBy === "assigneeName" ? "assigneeId" : filters.sortBy,
          desc: filters.sortDirection === "desc",
        },
      ]
    : [];
  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    const first = next[0];
    const sortBy = first
      ? ((first.id === "assigneeId" ? "assigneeName" : first.id) as TaskSort)
      : null;
    dispatch(
      sortingChanged({ sortBy, sortDirection: first?.desc ? "desc" : "asc" }),
    );
  };
  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const current = { pageIndex: page.pageIndex, pageSize: page.pageSize };
    const next = typeof updater === "function" ? updater(current) : updater;
    dispatch(paginationChanged({ ...next, scopeKey }));
  };
  const props: TaskListProps = {
    page,
    objects: objects.data ?? [],
    users: users.data ?? [],
    manager,
    showObject: !objectId,
    sorting,
    onSortingChange,
    onPaginationChange,
    isFetching: tasks.isFetching,
  };
  return {
    props,
    isLoading:
      !tasks.data || (!objectId && !objects.data) || (manager && !users.data),
    error: tasks.error ?? objects.error ?? users.error,
    refetch: () => {
      void tasks.refetch();
      if (!objectId) void objects.refetch();
      if (manager) void users.refetch();
    },
  };
}
