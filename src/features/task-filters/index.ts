import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { TaskStatus } from "@/shared/api";
interface FiltersState {
  search: string;
  status: TaskStatus | "all";
  assigneeId: string;
  objectId: string;
}
const initialState: FiltersState = {
  search: "",
  status: "all",
  assigneeId: "all",
  objectId: "all",
};
const slice = createSlice({
  name: "taskFilters",
  initialState,
  reducers: {
    filtersChanged(state, action: PayloadAction<Partial<FiltersState>>) {
      Object.assign(state, action.payload);
    },
    filtersReset() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase("session/sessionChanged", () => initialState);
  },
});
export const { filtersChanged, filtersReset } = slice.actions;
export const taskFiltersReducer = slice.reducer;
export const useTaskFilters = () =>
  useSelector((state: { taskFilters: FiltersState }) => state.taskFilters);
export const useFiltersDispatch = () => useDispatch();
