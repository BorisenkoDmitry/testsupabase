import { ArrowRight, Check, Clock3, History } from "lucide-react";
import { StatusBadge, statusLabels, type TaskHistory } from "@/entities/task";
import type { User } from "@/entities/user";
import { formatDate } from "@/shared/lib/utils";
export function TaskHistoryPanel({
  history,
  users,
  total,
}: {
  history: TaskHistory[];
  users: User[];
  total: number;
}) {
  return (
    <section className="detail-panel history-panel">
      <h2>
        <History size={19} />
        История изменений <span className="count-badge">{total}</span>
      </h2>
      <ol className="timeline">
        {history.map((event) => {
          const actor = users.find((item) => item.id === event.actorId);
          return (
            <li key={event.id}>
              <span
                className={`timeline-dot ${event.toStatus === "accepted" ? "timeline-dot-complete" : ""}`}
              >
                {event.toStatus === "accepted" ? (
                  <Check size={13} />
                ) : (
                  <Clock3 size={12} />
                )}
              </span>
              <div className="timeline-event">
                <div className="timeline-event-head">
                  <strong>{actor?.name ?? "Пользователь"}</strong>
                  <time dateTime={event.createdAt}>
                    {formatDate(event.createdAt, true)}
                  </time>
                </div>
                <div className="history-transition">
                  {event.fromStatus ? (
                    <>
                      <span>{statusLabels[event.fromStatus]}</span>
                      <ArrowRight size={14} />
                    </>
                  ) : (
                    <span>
                      Создание задачи <ArrowRight size={14} />
                    </span>
                  )}
                  <StatusBadge status={event.toStatus} />
                </div>
                {event.comment && (
                  <p className="history-comment">{event.comment}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
