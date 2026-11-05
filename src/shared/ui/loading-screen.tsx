import { Loader2 } from "lucide-react";
import { useDelayedVisible } from "@/shared/lib/use-delayed-visible";

export function LoadingScreen({
  compact = false,
  label = "Загружаем рабочее пространство…",
}: {
  compact?: boolean;
  label?: string;
}) {
  const visible = useDelayedVisible(true);
  return (
    <div
      className={`loading-state ${compact ? "loading-state-compact" : ""}`}
      aria-busy="true"
    >
      {visible && (
        <span className="loading-indicator" role="status">
          <Loader2 className="spin" size={compact ? 20 : 24} />
          <span>{label}</span>
        </span>
      )}
    </div>
  );
}
