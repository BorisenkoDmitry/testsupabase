import type {
  OnChangeFn,
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import type { TaskPage, ObjectOption, User } from "@/shared/api";
export interface TaskListProps {
  page: TaskPage;
  objects: ObjectOption[];
  users: User[];
  manager: boolean;
  showObject?: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  onPaginationChange: OnChangeFn<PaginationState>;
  isFetching: boolean;
}
