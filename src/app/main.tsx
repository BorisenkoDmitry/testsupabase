import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { SessionBootstrap } from "@/features/auth";
import { store } from "./store";
import { router } from "./router";
import { installChunkRecovery } from "@/shared/lib/chunk-recovery";
import "./styles.css";
import "@fontsource-variable/manrope";
installChunkRecovery();
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <SessionBootstrap>
          <RouterProvider router={router} />
        </SessionBootstrap>
        <Toaster position="bottom-right" richColors closeButton />
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
