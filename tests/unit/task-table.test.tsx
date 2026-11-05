// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, it, expect, vi } from "vitest";
import type { PropsWithChildren } from "react";
import { createSeed, demoUsers } from "@/shared/api/mock/seed";
import { mockTasks } from "@/shared/api/mock/list-simulator";
import {
  taskFiltersReducer,
  filtersChanged,
  paginationChanged,
  sortingChanged,
} from "@/features/task-filters";
import { useTaskTable } from "@/widgets/task-list/model/use-task-table";
import type { TaskListProps } from "@/widgets/task-list/model/types";
afterEach(cleanup);
function setup(manager = true) {
  const store = configureStore({
    reducer: { taskFilters: taskFiltersReducer },
  });
  const db = createSeed();
  const page = mockTasks(db.tasks, db.objects, demoUsers, { pageSize: 2 });
  const props: TaskListProps = {
    page,
    objects: db.objects,
    users: demoUsers,
    manager,
    showObject: true,
    sorting: [],
    onSortingChange: vi.fn(),
    onPaginationChange: vi.fn(),
    isFetching: false,
  };
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );
  return {
    store,
    props,
    ...renderHook((p) => useTaskTable(p), { initialProps: props, wrapper }),
  };
}
it("renders exactly the server page despite search, filters, sort and page position", () => {
  const { store, props, result, rerender } = setup();
  const ids = props.page.items.map((t) => t.id);
  act(() =>
    store.dispatch(
      filtersChanged({
        search: "NO MATCH",
        status: "accepted",
        assigneeId: "other",
        objectId: "other",
      }),
    ),
  );
  rerender({
    ...props,
    sorting: [{ id: "title", desc: false }],
    page: { ...props.page, pageIndex: 3, total: 99 },
  });
  expect(result.current.table.getRowModel().rows.map((r) => r.id)).toEqual(ids);
  expect(result.current.table.options.manualFiltering).toBe(true);
  expect(result.current.table.options.manualSorting).toBe(true);
  expect(result.current.table.options.manualPagination).toBe(true);
  expect(result.current.table.getRowCount()).toBe(99);
  expect(result.current.table.getPageCount()).toBe(50);
});
it("sorting and pagination emit requests without transforming current rows", () => {
  const { props, result } = setup();
  const before = result.current.table.getRowModel().rows.map((r) => r.id);
  act(() => result.current.table.getColumn("title")!.toggleSorting());
  expect(props.onSortingChange).toHaveBeenCalledTimes(1);
  act(() => result.current.table.nextPage());
  expect(props.onPaginationChange).toHaveBeenCalledTimes(1);
  expect(result.current.table.getRowModel().rows.map((r) => r.id)).toEqual(
    before,
  );
});
it("hides the assignee column for executors", () => {
  const { result } = setup(false);
  expect(
    result.current.table
      .getVisibleLeafColumns()
      .some((c) => c.id === "assigneeId"),
  ).toBe(false);
});
it("filter, sort and page-size changes reset the requested page", () => {
  const { store } = setup();
  store.dispatch(
    paginationChanged({ pageIndex: 4, pageSize: 10, scopeKey: "all" }),
  );
  store.dispatch(filtersChanged({ status: "new" }));
  expect(store.getState().taskFilters.pageIndex).toBe(0);
  store.dispatch(
    paginationChanged({ pageIndex: 3, pageSize: 10, scopeKey: "all" }),
  );
  store.dispatch(sortingChanged({ sortBy: "title", sortDirection: "asc" }));
  expect(store.getState().taskFilters.pageIndex).toBe(0);
  store.dispatch(
    paginationChanged({ pageIndex: 3, pageSize: 20, scopeKey: "all" }),
  );
  expect(store.getState().taskFilters.pageIndex).toBe(0);
});
