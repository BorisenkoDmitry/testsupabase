import { useState, Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { Sidebar } from "@/shared/ui/sidebar";
import { SidebarContent } from "./ui/sidebar-content";
import { Topbar } from "./ui/topbar";
export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const section = location.pathname.startsWith("/objects")
    ? "Объекты"
    : location.pathname.startsWith("/my-tasks")
      ? "Мои задачи"
      : "Задачи";
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        К содержимому
      </a>
      <Sidebar open={mobileOpen} onOpenChange={setMobileOpen}>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </Sidebar>
      <div className="main-shell">
        <Topbar
          section={section}
          mobileOpen={mobileOpen}
          onMenuOpen={() => setMobileOpen(true)}
        />
        <main id="main" tabIndex={-1}>
          <Suspense key={location.pathname} fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="app-footer">
          <span>Контур · Объекты и задачи</span>
          <span>Всё важное — в одном рабочем пространстве</span>
        </footer>
      </div>
    </div>
  );
}
