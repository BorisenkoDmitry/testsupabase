import type { Task, TaskStatus, User } from "@/shared/api/contracts";

export function allowedTransitions(task: Task, user: User): TaskStatus[] {
  if (user.role === "manager")
    return task.status === "review" ? ["accepted", "revision"] : [];
  if (task.assigneeId !== user.id) return [];
  if (task.status === "new" || task.status === "revision")
    return ["in_progress"];
  return task.status === "in_progress" ? ["review"] : [];
}
export function assertTransition(
  task: Task,
  user: User,
  status: TaskStatus,
  comment?: string,
) {
  if (!allowedTransitions(task, user).includes(status))
    throw new Error("Этот переход статуса недоступен.");
  if (status === "revision" && !comment?.trim())
    throw new Error("Укажите причину возврата на доработку.");
}
