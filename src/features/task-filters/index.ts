import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { TaskStatus, TaskSort, SortDirection } from "@/shared/api";
export interface FiltersState {
  search: string;
  status: TaskStatus | "all";
  assigneeId: string;
  objectId: string;
  pageIndex: number;
  pageSize: number;
  scopeKey: string;
  sortBy: TaskSort | null;
  sortDirection: SortDirection;
}
const initialState: FiltersState = {
  search: "",
  status: "all",
  assigneeId: "all",
  objectId: "all",
  pageIndex: 0,
  pageSize: 10,
  scopeKey: "all",
  sortBy: null,
  sortDirection: "desc",
};
const slice = createSlice({
  name: "taskFilters",
  initialState,
  reducers: {
    filtersChanged(
      state,
      action: PayloadAction<
        Partial<
          Pick<FiltersState, "search" | "status" | "assigneeId" | "objectId">
        >
      >,
    ) {
      Object.assign(state, action.payload);
      state.pageIndex = 0;
    },
    paginationChanged(
      state,
      action: PayloadAction<{
        pageIndex: number;
        pageSize: number;
        scopeKey: string;
      }>,
    ) {
      const changed = state.pageSize !== action.payload.pageSize;
      Object.assign(state, action.payload);
      if (changed) state.pageIndex = 0;
    },
    sortingChanged(
      state,
      action: PayloadAction<{
        sortBy: TaskSort | null;
        sortDirection: SortDirection;
      }>,
    ) {
      Object.assign(state, action.payload);
      state.pageIndex = 0;
    },
    filtersReset() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase("session/sessionChanged", () => initialState);
  },
});
export const {
  filtersChanged,
  filtersReset,
  paginationChanged,
  sortingChanged,
} = slice.actions;
export const taskFiltersReducer = slice.reducer;
export const useTaskFilters = () =>
  useSelector((state: { taskFilters: FiltersState }) => state.taskFilters);
export const useFiltersDispatch = () => useDispatch();
