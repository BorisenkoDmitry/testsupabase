// @vitest-environment jsdom
import type { PropsWithChildren } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createSeed, demoUsers } from "@/shared/api/mock/seed";
import {
  filtersChanged,
  filtersReset,
  taskFiltersReducer,
} from "@/features/task-filters";
import { useTaskTable } from "@/widgets/task-list/model/use-task-table";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function setup(showObject = true, manager = true) {
  const store = configureStore({
    reducer: { taskFilters: taskFiltersReducer },
  });
  const db = createSeed();
  const props = {
    tasks: db.tasks,
    objects: db.objects,
    users: demoUsers,
    manager,
    showObject,
  };
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, ...renderHook(() => useTaskTable(props), { wrapper }) };
}
it("combines object, status, executor and debounced search, then resets all filters", () => {
  const { result, store } = setup();
  expect(result.current.table.getRowModel().rows).toHaveLength(8);
  act(() => {
    store.dispatch(
      filtersChanged({
        objectId: "object-1",
        assigneeId: "user-ivan",
        status: "new",
      }),
    );
  });
  expect(result.current.table.getRowModel().rows.map((row) => row.id)).toEqual([
    "task-3",
  ]);
  act(() => {
    store.dispatch(filtersChanged({ search: "несуществующая" }));
  });
  expect(result.current.table.getRowModel().rows).toHaveLength(1);
  act(() => vi.advanceTimersByTime(300));
  expect(result.current.table.getRowModel().rows).toHaveLength(0);
  act(() => {
    store.dispatch(filtersReset());
    vi.advanceTimersByTime(300);
  });
  act(() => vi.advanceTimersByTime(300));
  expect(result.current.table.getRowModel().rows).toHaveLength(8);
});
it("ignores the global object filter inside an object card and hides the assignee column for executors", () => {
  const { result, store } = setup(false, false);
  act(() => {
    store.dispatch(
      filtersChanged({ objectId: "object-2", assigneeId: "user-alexey" }),
    );
  });
  expect(result.current.table.getRowModel().rows).toHaveLength(8);
  expect(
    result.current.table
      .getVisibleLeafColumns()
      .some((column) => column.id === "assigneeId"),
  ).toBe(false);
});

it("cycles title sorting through ascending, descending and the original order", () => {
  const { result } = setup();
  const original = result.current.table.getRowModel().rows.map((row) => row.id);
  const titles = () =>
    result.current.table.getRowModel().rows.map((row) => row.original.title);
  const expected = [...titles()].sort(
    new Intl.Collator("ru", { numeric: true, sensitivity: "base" }).compare,
  );
  act(() => result.current.table.getColumn("title")!.toggleSorting());
  expect(titles()).toEqual(expected);
  act(() => result.current.table.getColumn("title")!.toggleSorting());
  expect(titles()).toEqual([...expected].reverse());
  act(() => result.current.table.getColumn("title")!.toggleSorting());
  expect(result.current.table.getRowModel().rows.map((row) => row.id)).toEqual(
    original,
  );
});

it("sorts assignees by displayed Russian names, not their IDs", () => {
  const { result } = setup();
  act(() => result.current.table.getColumn("assigneeId")!.toggleSorting());
  expect(
    result.current.table
      .getRowModel()
      .rows.map((row) => row.original.assigneeId),
  ).toEqual([
    "user-alexey",
    "user-alexey",
    "user-alexey",
    "user-alexey",
    "user-ivan",
    "user-ivan",
    "user-ivan",
    "user-ivan",
  ]);
});

it("sorts status in workflow order and date from newest first, including after filtering", () => {
  const { result, store } = setup();
  act(() => result.current.table.getColumn("status")!.toggleSorting());
  expect(
    result.current.table.getRowModel().rows.map((row) => row.original.status),
  ).toEqual([
    "new",
    "new",
    "in_progress",
    "in_progress",
    "review",
    "revision",
    "accepted",
    "accepted",
  ]);
  act(() => result.current.table.getColumn("createdAt")!.toggleSorting());
  const timestamps = result.current.table
    .getRowModel()
    .rows.map((row) => Date.parse(row.original.createdAt));
  expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  act(() => {
    store.dispatch(filtersChanged({ objectId: "object-1" }));
  });
  expect(result.current.table.getRowModel().rows.map((row) => row.id)).toEqual([
    "task-3",
    "task-2",
    "task-1",
  ]);
});
