import { Link } from "react-router";
import { Building2 } from "lucide-react";
import type { Task } from "@/entities/task";
import type { ConstructionObject } from "@/entities/object";
import type { User } from "@/entities/user";
import { formatDate, initials } from "@/shared/lib/utils";
export function TaskMetadata({
  task,
  object,
  users,
}: {
  task: Task;
  object: ConstructionObject;
  users: User[];
}) {
  const assignee = users.find((item) => item.id === task.assigneeId);
  const author = users.find((item) => item.id === task.authorId);
  return (
    <aside className="detail-panel task-metadata">
      <h2>Детали</h2>
      <dl>
        <dt>Объект</dt>
        <dd>
          <Link className="object-detail-link" to={`/objects/${object.id}`}>
            <Building2 size={17} />
            {object.name}
          </Link>
        </dd>
        <dt>Исполнитель</dt>
        <dd className="person">
          <span className="avatar avatar-small">
            {initials(assignee?.name ?? "?")}
          </span>
          <span>
            {assignee?.name}
            <small>Исполнитель</small>
          </span>
        </dd>
        <dt>Постановщик</dt>
        <dd className="person">
          <span className="avatar avatar-small avatar-neutral">
            {initials(author?.name ?? "?")}
          </span>
          <span>
            {author?.name}
            <small>Автор задачи</small>
          </span>
        </dd>
        <dt>Дата создания</dt>
        <dd>{formatDate(task.createdAt, true)}</dd>
      </dl>
      <div className="metadata-note">
        Все изменения статуса сохраняются в истории задачи.
      </div>
    </aside>
  );
}
