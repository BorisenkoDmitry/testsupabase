import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { User } from "@/shared/api";
export interface SessionState {
  user: User | null;
  ready: boolean;
}
const slice = createSlice({
  name: "session",
  initialState: { user: null, ready: false } as SessionState,
  reducers: {
    sessionChanged(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.ready = true;
    },
  },
});
export const { sessionChanged } = slice.actions;
export const sessionReducer = slice.reducer;
export const useSession = () =>
  useSelector((state: { session: SessionState }) => state.session);
export const useSessionDispatch = () => useDispatch();
