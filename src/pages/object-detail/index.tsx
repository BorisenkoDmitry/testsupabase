import { Link, useParams } from "react-router";
import { useSuspenseQueries } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import { useSession } from "@/entities/session";
import { objectQuery } from "@/entities/object";
import { tasksQuery } from "@/entities/task";
import { usersQuery } from "@/entities/user";
import { ObjectForm } from "@/features/object-form";
import { TaskForm } from "@/features/task-form";
import { useDeleteRecord } from "@/features/delete-record";
import { TaskList } from "@/widgets/task-list";
import { ConfirmDelete } from "@/shared/ui/confirm-dialog";
export default function ObjectDetailPage() {
  const { id = "" } = useParams();
  const { user } = useSession();
  const manager = user!.role === "manager";
  const [{ data: object }, { data: tasks }, { data: users }] =
    useSuspenseQueries({
      queries: [
        objectQuery(user!.id, id),
        tasksQuery(user!.id),
        usersQuery(user!.id),
      ],
    });
  const deletion = useDeleteRecord("object", id, "/objects", object.version);
  const objectTasks = tasks.filter((task) => task.objectId === id);
  return (
    <div className="page">
      <Link to="/objects" className="back-link">
        <ArrowLeft size={16} />
        Все объекты
      </Link>
      <div className="page-heading">
        <div>
          <h1>{object.name}</h1>
          <p className="address-line">
            <MapPin size={16} />
            {object.address}
          </p>
        </div>
        {manager && (
          <div className="inline-actions">
            <ObjectForm object={object} />
            <ConfirmDelete
              title="Удалить объект?"
              description={
                objectTasks.length
                  ? "У объекта есть задачи. Сначала удалите их, затем вернитесь к удалению объекта."
                  : `Объект «${object.name}» будет удалён. Это действие нельзя отменить.`
              }
              disabled={objectTasks.length > 0}
              onConfirm={() => deletion.mutateAsync(object.version)}
            />
          </div>
        )}
      </div>
      {manager && objectTasks.length > 0 && (
        <p className="subtle-note">
          Для удаления объекта сначала удалите его задачи.
        </p>
      )}
      <div className="section-heading">
        <div>
          <h2>
            Задачи объекта <span>{objectTasks.length}</span>
          </h2>
          <p>
            {manager
              ? "Поручения и результаты работы на этой стройке."
              : "Здесь показаны только назначенные вам задачи."}
          </p>
        </div>
        {manager && <TaskForm objectId={id} />}
      </div>
      <TaskList
        tasks={objectTasks}
        objects={[object]}
        users={users}
        manager={manager}
        showObject={false}
      />
    </div>
  );
}
