// @vitest-environment jsdom
import { Suspense } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LoadingScreen } from "@/shared/ui/loading-screen";

let client: QueryClient;
beforeEach(() => {
  vi.useFakeTimers();
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
});
function Data({ request }: { request: () => Promise<string> }) {
  const { data } = useSuspenseQuery({ queryKey: ["test"], queryFn: request });
  return <p>{data}</p>;
}
function open(request: () => Promise<string>) {
  return render(
    <QueryClientProvider client={client}>
      <Suspense fallback={<LoadingScreen />}>
        <Data request={request} />
      </Suspense>
    </QueryClientProvider>,
  );
}
it("uses cached data immediately without mounting an indicator or requesting again", () => {
  client.setQueryData(["test"], "Из кэша");
  const request = vi.fn(async () => "Новые данные");
  open(request);
  expect(screen.getByText("Из кэша")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
  expect(request).not.toHaveBeenCalled();
});
it("shows an indicator only for slow uncached data and removes it when data arrives", async () => {
  let resolve!: (value: string) => void;
  const request = () =>
    new Promise<string>((done) => {
      resolve = done;
    });
  open(request);
  expect(screen.queryByRole("status")).toBeNull();
  await act(async () => {
    vi.advanceTimersByTime(299);
  });
  expect(screen.queryByRole("status")).toBeNull();
  await act(async () => {
    vi.advanceTimersByTime(1);
  });
  expect(screen.getByRole("status")).toBeTruthy();
  await act(async () => {
    resolve("Готово");
  });
  expect(screen.getByText("Готово")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
});
