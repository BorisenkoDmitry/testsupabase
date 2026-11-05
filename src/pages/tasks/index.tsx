import { TaskForm } from "@/features/task-form";
import { TaskList, useTaskListData } from "@/widgets/task-list";
import { CirclePlus, Timer, ClipboardCheck } from "lucide-react";
import { SummaryCard } from "@/shared/ui/summary-card";
import { LoadingScreen, ErrorState } from "@/shared/ui/states";
export default function TasksPage() {
  const model = useTaskListData();
  const { manager, page, objects } = model.props;
  if (model.error)
    return <ErrorState message={model.error.message} onRetry={model.refetch} />;
  if (model.isLoading) return <LoadingScreen />;
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
          value={page.summary.newCount}
        />
        <SummaryCard
          icon={Timer}
          label="В работе и на доработке"
          value={page.summary.inProgressCount}
          tone="green"
        />
        <SummaryCard
          icon={ClipboardCheck}
          label="На проверке"
          value={page.summary.reviewCount}
          tone="amber"
        />
      </div>
      <TaskList {...model.props} />
    </div>
  );
}
