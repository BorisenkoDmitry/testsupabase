import { ArrowLeft, FolderOpen, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { Button } from "./button";
export { LoadingScreen } from "./loading-screen";
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <FolderOpen size={30} strokeWidth={1.5} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="empty-state">
      <TriangleAlert size={30} />
      <h2>Не удалось открыть страницу</h2>
      <p>{message}</p>
      <div className="inline-actions">
        {onRetry && <Button onClick={onRetry}>Попробовать ещё раз</Button>}
        <Button asChild variant="outline">
          <Link to="/objects">
            <ArrowLeft size={16} />К объектам
          </Link>
        </Button>
      </div>
    </div>
  );
}
