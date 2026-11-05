import { configureStore } from "@reduxjs/toolkit";
import { sessionReducer } from "@/entities/session";
import { taskFiltersReducer } from "@/features/task-filters";
export const store = configureStore({
  reducer: { session: sessionReducer, taskFilters: taskFiltersReducer },
});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
