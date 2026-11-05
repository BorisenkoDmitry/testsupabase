import { Link } from "react-router";
import { ArrowUpRight, Building2, Check, MapPin } from "lucide-react";
import type { ObjectListItem } from "@/entities/object";
export function ObjectCard({
  obj,
  index,
  manager,
}: {
  obj: ObjectListItem;
  index: number;
  manager: boolean;
}) {
  const completed = obj.acceptedCount;
  const review = obj.reviewCount;
  return (
    <Link to={`/objects/${obj.id}`} className="object-card">
      <div className={`object-card-top object-tone-${index % 3}`}>
        <Building2 size={36} strokeWidth={1.2} />
        <span className="object-kind">Строительный объект</span>
        <ArrowUpRight size={20} className="object-arrow" />
      </div>
      <div className="object-card-body">
        <h2>{obj.name}</h2>
        <p className="object-address">
          <MapPin size={15} />
          {obj.address}
        </p>
        <div className="object-progress-label">
          <span>{manager ? "Выполнение задач" : "Мои задачи"}</span>
          <strong>
            {completed} / {obj.taskCount}
          </strong>
        </div>
        <div className="progress-track">
          <span
            style={{
              width: `${obj.taskCount ? (completed / obj.taskCount) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="object-card-footer">
          <span>{obj.taskCount} задач</span>
          {review > 0 ? (
            <span className="review-text">{review} на проверке</span>
          ) : completed === obj.taskCount && completed > 0 ? (
            <span className="completed-text">
              <Check size={14} />
              Всё принято
            </span>
          ) : (
            <span>Открыть объект →</span>
          )}
        </div>
      </div>
    </Link>
  );
}
