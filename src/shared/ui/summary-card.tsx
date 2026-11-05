import type { LucideIcon } from "lucide-react";

export function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "blue",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: "blue" | "amber" | "green";
}) {
  return (
    <div className="summary-card">
      <span className={`summary-icon summary-icon-${tone}`}>
        <Icon size={20} strokeWidth={1.7} />
      </span>
      <div className="summary-content">
        <span className="summary-label">{label}</span>
        <strong className="summary-value">{value}</strong>
      </div>
    </div>
  );
}
