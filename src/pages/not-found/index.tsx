import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
export default function NotFoundPage() {
  return (
    <div className="empty-state">
      <span className="not-found-code">404</span>
      <h1>Страница не найдена</h1>
      <p>Возможно, адрес изменился или в ссылке есть опечатка.</p>
      <Button asChild>
        <Link to="/objects">
          <ArrowLeft size={16} />К объектам
        </Link>
      </Button>
    </div>
  );
}
