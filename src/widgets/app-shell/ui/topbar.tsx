import { ChevronRight, Menu } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useSession } from "@/entities/session";
import { initials } from "@/shared/lib/utils";
import { dataProvider } from "@/shared/api";
export function Topbar({
  section,
  mobileOpen,
  onMenuOpen,
}: {
  section: string;
  mobileOpen: boolean;
  onMenuOpen: () => void;
}) {
  const { user } = useSession();
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <Button
          variant="ghost"
          size="icon"
          className="mobile-menu"
          id="mobile-menu-trigger"
          aria-label="Открыть меню"
          aria-expanded={mobileOpen}
          aria-controls="workspace-sidebar"
          onClick={onMenuOpen}
        >
          <Menu size={21} />
        </Button>
        <span>Рабочее пространство</span>
        <ChevronRight size={14} />
        <strong>{section}</strong>
      </div>
      <div className="topbar-actions">
        <span className="environment-badge">
          <span />
          {dataProvider === "mock" ? "Демо-режим" : "Команда онлайн"}
        </span>
        {user && (
          <div className="topbar-profile">
            <div>
              <strong>{user.name}</strong>
              <span>
                {user.role === "manager" ? "Постановщик" : "Исполнитель"}
              </span>
            </div>
            <span className="avatar">{initials(user.name)}</span>
          </div>
        )}
      </div>
    </header>
  );
}
