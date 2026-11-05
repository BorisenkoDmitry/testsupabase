import { Link, useParams } from "react-router";
import { useState } from "react";
import { Pagination } from "@/shared/ui/pagination";
import { useSuspenseQuery, useSuspenseQueries } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/entities/session";
import { taskQuery, historyQuery, StatusBadge } from "@/entities/task";
import { objectQuery } from "@/entities/object";
import { usersQuery } from "@/entities/user";
import { TaskForm } from "@/features/task-form";
import { TaskActions } from "@/features/task-actions";
import { useDeleteRecord } from "@/features/delete-record";
import { ConfirmDelete } from "@/shared/ui/confirm-dialog";
import { TaskHistoryPanel } from "./ui/task-history";
import { TaskMetadata } from "./ui/task-metadata";
export default function TaskDetailPage() {
  const { id = "" } = useParams();
  const { user } = useSession();
  const [historyPageIndex, setHistoryPageIndex] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const { data: task } = useSuspenseQuery(taskQuery(user!.id, id));
  const [{ data: object }, { data: users }, { data: history }] =
    useSuspenseQueries({
      queries: [
        objectQuery(user!.id, task.objectId),
        usersQuery(user!.id),
        historyQuery(user!.id, id, {
          pageIndex: historyPageIndex,
          pageSize: historyPageSize,
        }),
      ],
    });
  const manager = user!.role === "manager";
  const deletion = useDeleteRecord(
    "task",
    id,
    `/objects/${task.objectId}`,
    task.version,
  );
  return (
    <div className="page">
      <Link to={`/objects/${object.id}`} className="back-link">
        <ArrowLeft size={16} />
        {object.name}
      </Link>
      <div className="page-heading task-heading">
        <div>
          <StatusBadge status={task.status} />
          <h1>{task.title}</h1>
        </div>
        {manager && (
          <div className="inline-actions">
            <TaskForm task={task} />
            <ConfirmDelete
              title="Удалить задачу?"
              description="Задача будет скрыта из списков. История сохранится в базе для аудита."
              onConfirm={() => deletion.mutateAsync(task.version)}
            />
          </div>
        )}
      </div>
      <div className="task-detail-grid">
        <div className="task-main">
          <section className="detail-panel">
            <h2>Описание задачи</h2>
            <p
              className={`task-description ${!task.description ? "muted" : ""}`}
            >
              {task.description || "Автор не добавил описание."}
            </p>
            <TaskActions task={task} />
          </section>
          <TaskHistoryPanel
            history={history.items}
            total={history.total}
            users={users}
          />
          <Pagination
            {...history}
            label="Пагинация истории"
            onPageChange={setHistoryPageIndex}
            onPageSizeChange={(size) => {
              setHistoryPageSize(size);
              setHistoryPageIndex(0);
            }}
          />
        </div>
        <TaskMetadata task={task} object={object} users={users} />
      </div>
    </div>
  );
}
