import { queryOptions } from "@tanstack/react-query";
import { api, type TaskStatus } from "@/shared/api";
export type { Task, TaskInput, TaskHistory, TaskStatus } from "@/shared/api";
export { allowedTransitions } from "@/shared/lib/task-workflow";
export const statusLabels: Record<TaskStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  review: "На проверке",
  revision: "На доработке",
  accepted: "Принята",
};
export const statusOrder = Object.keys(statusLabels) as TaskStatus[];
export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span />
      {statusLabels[status]}
    </span>
  );
}
export const tasksQuery = (userId: string) =>
  queryOptions({
    queryKey: ["crm", userId, "tasks"],
    queryFn: () => api.tasks.list(),
  });
export const taskQuery = (userId: string, id: string) =>
  queryOptions({
    queryKey: ["crm", userId, "task", id],
    queryFn: () => api.tasks.get(id),
  });
export const historyQuery = (userId: string, id: string) =>
  queryOptions({
    queryKey: ["crm", userId, "history", id],
    queryFn: () => api.tasks.history(id),
  });
