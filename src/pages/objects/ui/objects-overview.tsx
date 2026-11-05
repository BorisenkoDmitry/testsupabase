import type { ObjectSummary } from "@/entities/object";
import { Building2, ClipboardList, Clock3 } from "lucide-react";
import { SummaryCard } from "@/shared/ui/summary-card";
export function ObjectsOverview({
  summary,
  manager,
}: {
  summary: ObjectSummary;
  manager: boolean;
}) {
  return (
    <div className="overview-strip">
      <SummaryCard
        icon={Building2}
        label="Объектов в пространстве"
        value={summary.objectCount}
      />
      <SummaryCard
        icon={ClipboardList}
        label={manager ? "Активных задач" : "Моих активных задач"}
        value={summary.activeTaskCount}
        tone="green"
      />
      <SummaryCard
        icon={Clock3}
        label="Ожидают проверки"
        value={summary.reviewCount}
        tone="amber"
      />
    </div>
  );
}
