import type { ConstructionObject } from "@/entities/object";
import type { Task } from "@/entities/task";
import { Building2, ClipboardList, Clock3 } from "lucide-react";
import { SummaryCard } from "@/shared/ui/summary-card";
export function ObjectsOverview({
  objects,
  tasks,
  manager,
}: {
  objects: ConstructionObject[];
  tasks: Task[];
  manager: boolean;
}) {
  return (
    <div className="overview-strip">
      <SummaryCard
        icon={Building2}
        label="Объектов в пространстве"
        value={objects.length}
      />
      <SummaryCard
        icon={ClipboardList}
        label={manager ? "Активных задач" : "Моих активных задач"}
        value={tasks.filter((task) => task.status !== "accepted").length}
        tone="green"
      />
      <SummaryCard
        icon={Clock3}
        label="Ожидают проверки"
        value={tasks.filter((task) => task.status === "review").length}
        tone="amber"
      />
    </div>
  );
}
