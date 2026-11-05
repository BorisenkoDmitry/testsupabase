import { Link, useParams } from "react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin } from "lucide-react";
import { useSession } from "@/entities/session";
import { objectQuery } from "@/entities/object";
import { ObjectForm } from "@/features/object-form";
import { TaskForm } from "@/features/task-form";
import { useDeleteRecord } from "@/features/delete-record";
import { TaskList, useTaskListData } from "@/widgets/task-list";
import { ConfirmDelete } from "@/shared/ui/confirm-dialog";
import { LoadingScreen, ErrorState } from "@/shared/ui/states";
export default function ObjectDetailPage() {
  const { id = "" } = useParams();
  const { user } = useSession();
  const manager = user!.role === "manager";
  const model = useTaskListData(id);
  const { data: object } = useSuspenseQuery(objectQuery(user!.id, id));
  const deletion = useDeleteRecord("object", id, "/objects", object.version);
  if (model.error)
    return <ErrorState message={model.error.message} onRetry={model.refetch} />;
  if (model.isLoading) return <LoadingScreen />;
  const taskCount = model.props.page.summary.total;
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
                taskCount
                  ? "У объекта есть задачи. Сначала удалите их, затем вернитесь к удалению объекта."
                  : `Объект «${object.name}» будет удалён.`
              }
              disabled={taskCount > 0}
              onConfirm={() => deletion.mutateAsync(object.version)}
            />
          </div>
        )}
      </div>
      {manager && taskCount > 0 && (
        <p className="subtle-note">
          Для удаления объекта сначала удалите его задачи.
        </p>
      )}
      <div className="section-heading">
        <div>
          <h2>
            Задачи объекта <span>{taskCount}</span>
          </h2>
          <p>
            {manager
              ? "Поручения и результаты работы на этой стройке."
              : "Здесь показаны только назначенные вам задачи."}
          </p>
        </div>
        {manager && <TaskForm objectId={id} />}
      </div>
      <TaskList {...model.props} />
    </div>
  );
}
