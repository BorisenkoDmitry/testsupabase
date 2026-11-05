import { Link, NavLink } from "react-router";
import {
  Building2,
  CheckCheck,
  HardHat,
  LayoutGrid,
  LogOut,
  X,
} from "lucide-react";
import { useSession } from "@/entities/session";
import { useLogout } from "@/features/auth";
import { initials } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { dataProvider } from "@/shared/api";
export function SidebarContent({ onClose }: { onClose: () => void }) {
  const { user } = useSession();
  const logout = useLogout();
  return (
    <>
      <Link to="/objects" className="brand" onClick={onClose}>
        <span className="brand-mark">
          <Building2 size={23} />
        </span>
        <span>
          контур<span className="brand-caption">Объекты и задачи</span>
        </span>
      </Link>
      <button
        className="mobile-sidebar-close"
        aria-label="Закрыть меню"
        onClick={onClose}
      >
        <X />
      </button>
      <div className="workspace-name">
        <span className="workspace-icon">
          <HardHat size={17} />
        </span>
        <span>
          Строительная команда<small>Рабочее пространство</small>
        </span>
      </div>
      <nav aria-label="Главная навигация">
        <NavLink to="/objects" onClick={onClose}>
          <LayoutGrid size={19} />
          Объекты
        </NavLink>
        <NavLink
          to={user!.role === "manager" ? "/tasks" : "/my-tasks"}
          onClick={onClose}
        >
          <CheckCheck size={19} />
          {user!.role === "manager" ? "Все задачи" : "Мои задачи"}
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <div className="demo-note">
          <span className="demo-dot" />
          {dataProvider === "mock"
            ? "Демо-пространство"
            : "Пространство команды"}
          <p>
            {dataProvider === "mock"
              ? "Демо-данные сохраняются в этом браузере."
              : "Данные сохраняются для всей команды с учётом прав доступа."}
          </p>
        </div>
        <div className="sidebar-user">
          <span className="avatar">{initials(user!.name)}</span>
          <span>
            <strong>{user!.name}</strong>
            <small>
              {user!.role === "manager" ? "Постановщик" : "Исполнитель"}
            </small>
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Выйти из аккаунта"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </>
  );
}
