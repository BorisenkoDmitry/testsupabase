import { useSuspenseQueries } from "@tanstack/react-query";
import { useSession } from "@/entities/session";
import { tasksQuery } from "@/entities/task";
import { objectsQuery } from "@/entities/object";
import { usersQuery } from "@/entities/user";
import { TaskForm } from "@/features/task-form";
import { TaskList } from "@/widgets/task-list";
import { CirclePlus, Timer, ClipboardCheck } from "lucide-react";
import { SummaryCard } from "@/shared/ui/summary-card";
export default function TasksPage() {
  const { user } = useSession();
  const manager = user!.role === "manager";
  const [{ data: tasks }, { data: objects }, { data: users }] =
    useSuspenseQueries({
      queries: [
        tasksQuery(user!.id),
        objectsQuery(user!.id),
        usersQuery(user!.id),
      ],
    });
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{manager ? "Все задачи" : "Мои задачи"}</h1>
          <p>
            {manager
              ? "Распределяйте работу и принимайте результаты команды."
              : "Ваша работа на всех объектах — от поручения до приёмки."}
          </p>
        </div>
        {manager && objects.length > 0 && <TaskForm />}
      </div>
      <div className="overview-strip">
        <SummaryCard
          icon={CirclePlus}
          label="Новых задач"
          value={tasks.filter((task) => task.status === "new").length}
        />
        <SummaryCard
          icon={Timer}
          label="В работе и на доработке"
          value={
            tasks.filter(
              (task) =>
                task.status === "in_progress" || task.status === "revision",
            ).length
          }
          tone="green"
        />
        <SummaryCard
          icon={ClipboardCheck}
          label="На проверке"
          value={tasks.filter((task) => task.status === "review").length}
          tone="amber"
        />
      </div>
      <TaskList
        tasks={tasks}
        objects={objects}
        users={users}
        manager={manager}
      />
    </div>
  );
}
