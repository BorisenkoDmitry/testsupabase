import { createSupabaseApi } from "./supabase/provider";
import { createSupabaseClient } from "./supabase/client";
export const dataProvider = import.meta.env.VITE_DATA_PROVIDER ?? "supabase";
if (dataProvider !== "mock" && dataProvider !== "supabase")
  throw new Error("Неизвестный адаптер данных.");
export const api =
  dataProvider === "mock"
    ? (await import("./mock/provider")).createMockApi()
    : createSupabaseApi(createSupabaseClient());
export { CrmError, isConflict } from "./errors";
export type * from "./contracts";
