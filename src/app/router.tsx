import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  useRouteError,
  useRevalidator,
} from "react-router";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { RequireAuth } from "@/features/auth";
import { AppShell } from "@/widgets/app-shell";
import { ErrorState, LoadingScreen } from "@/shared/ui/states";
const LoginPage = lazy(() => import("@/pages/login"));
const ObjectsPage = lazy(() => import("@/pages/objects"));
const ObjectDetailPage = lazy(() => import("@/pages/object-detail"));
const TasksPage = lazy(() => import("@/pages/tasks"));
const TaskDetailPage = lazy(() => import("@/pages/task-detail"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));
function RouteError() {
  const error = useRouteError();
  const revalidator = useRevalidator();
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : "Проверьте адрес страницы и попробуйте ещё раз."
          }
          onRetry={() => {
            reset();
            revalidator.revalidate();
          }}
        />
      )}
    </QueryErrorResetBoundary>
  );
}
export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <LoginPage />
      </Suspense>
    ),
    errorElement: <RouteError />,
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/objects" replace /> },
      { path: "/objects", element: <ObjectsPage /> },
      { path: "/objects/:id", element: <ObjectDetailPage /> },
      { path: "/tasks", element: <TasksPage /> },
      { path: "/my-tasks", element: <TasksPage /> },
      { path: "/tasks/:id", element: <TaskDetailPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
