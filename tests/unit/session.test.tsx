// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { User } from "@/shared/api/contracts";
const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  unsubscribe: vi.fn(),
  listener: undefined as undefined | (() => void),
}));
vi.mock("@/shared/api", () => ({
  api: {
    auth: {
      getSession: auth.getSession,
      onSessionChange: (listener: () => void) => {
        auth.listener = listener;
        return auth.unsubscribe;
      },
    },
  },
}));
import { SessionBootstrap } from "@/features/auth/model/session";
import { sessionReducer, useSession } from "@/entities/session";
const manager: User = {
  id: "manager",
  name: "Руководитель",
  email: "manager@example.test",
  role: "manager",
};
const worker: User = {
  id: "worker",
  name: "Исполнитель",
  email: "worker@example.test",
  role: "executor",
};
beforeEach(() => {
  vi.clearAllMocks();
  auth.listener = undefined;
});
afterEach(cleanup);
function Probe() {
  const { user } = useSession();
  return <p>{user?.name ?? "Нет сессии"}</p>;
}
function setup() {
  const store = configureStore({ reducer: { session: sessionReducer } });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <SessionBootstrap>
          <Probe />
        </SessionBootstrap>
      </QueryClientProvider>
    </Provider>,
  );
  return { ...view, store, client };
}
it("restores a verified session and clears cached data when account changes", async () => {
  auth.getSession.mockResolvedValueOnce(manager).mockResolvedValueOnce(worker);
  const { client, unmount } = setup();
  await screen.findByText("Руководитель");
  client.setQueryData(["crm", "private-manager-data"], { private: true });
  act(() => auth.listener?.());
  await screen.findByText("Исполнитель");
  expect(client.getQueryData(["crm", "private-manager-data"])).toBeUndefined();
  unmount();
  expect(auth.unsubscribe).toHaveBeenCalledTimes(1);
});
it("handles session expiry and removes the previous user's cache", async () => {
  auth.getSession.mockResolvedValueOnce(manager).mockResolvedValueOnce(null);
  const { client } = setup();
  await screen.findByText("Руководитель");
  client.setQueryData(["crm", "tasks"], [{ secret: true }]);
  act(() => auth.listener?.());
  await screen.findByText("Нет сессии");
  expect(client.getQueryData(["crm", "tasks"])).toBeUndefined();
});
it("ignores an older session response after a newer authentication event", async () => {
  let resolveOld!: (u: User) => void;
  auth.getSession
    .mockImplementationOnce(
      () =>
        new Promise<User>((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValueOnce(worker);
  setup();
  act(() => auth.listener?.());
  await screen.findByText("Исполнитель");
  await act(async () => resolveOld(manager));
  expect(screen.queryByText("Руководитель")).toBeNull();
  expect(screen.getByText("Исполнитель")).toBeTruthy();
});
it("does not render protected content when verification fails", async () => {
  auth.getSession.mockRejectedValueOnce(
    new Error("Проверка сессии недоступна"),
  );
  const { store } = setup();
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe(
      "Проверка сессии недоступна",
    ),
  );
  expect(screen.queryByText("Нет сессии")).toBeNull();
  expect(store.getState().session.ready).toBe(false);
});
