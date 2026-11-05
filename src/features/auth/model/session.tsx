import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router";
import { api } from "@/shared/api";
import {
  sessionChanged,
  useSession,
  useSessionDispatch,
} from "@/entities/session";
import { Button } from "@/shared/ui/button";
import { LoadingScreen } from "@/shared/ui/loading-screen";
export function SessionBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useSessionDispatch();
  const { ready } = useSession();
  const client = useQueryClient();
  const lastSession = useRef<string | undefined>(undefined);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    const sync = () => {
      const request = ++sequence;
      api.auth
        .getSession()
        .then((user) => {
          if (!active || request !== sequence) return;
          setError("");
          const identity = JSON.stringify(user);
          if (identity !== lastSession.current) {
            client.clear();
            lastSession.current = identity;
            dispatch(sessionChanged(user));
          }
        })
        .catch((e: Error) => {
          if (active && request === sequence) {
            client.clear();
            setError(e.message);
          }
        });
    };
    const unsubscribe = api.auth.onSessionChange?.(sync);
    sync();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [dispatch, client, attempt]);
  if (error)
    return (
      <div className="empty-state">
        <h2>Не удалось восстановить сессию</h2>
        <p role="alert">{error}</p>
        <Button
          onClick={() => {
            setError("");
            setAttempt(attempt + 1);
          }}
        >
          Попробовать ещё раз
        </Button>
      </div>
    );
  return ready ? children : <LoadingScreen />;
}
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useSession();
  return user ? children : <Navigate to="/login" replace />;
}
export function useLogout() {
  const dispatch = useSessionDispatch();
  const client = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api.auth.signOut(),
    onSuccess: () => {
      client.clear();
      dispatch(sessionChanged(null));
      navigate("/login", { replace: true });
    },
  });
}
